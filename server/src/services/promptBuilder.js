/**
 * 5-layer prompt builder for training sessions.
 *
 * Layer 1: Core Protocol (from trainingProtocol.js)
 * Layer 2: Skill Context (from SkillCatalog.trainingContext)
 * Layer 3: Current State (concepts, reinforcement queue, social stats)
 * Layer 4: Session Instructions (by type: onboarding, training, assessment, kata)
 * Layer 5: Output Format (tool usage instructions)
 */

import Session from '../models/Session.js';
import { TRAINING_PROTOCOL } from '../prompts/trainingProtocol.js';
import { applyTimeDecay, BELT_ORDER } from './masteryCalc.js';
import { getPrioritizedConcepts } from './spacedRepetition.js';
import { isTechCategory } from '../utils/skillCategories.js';

/**
 * Build the full system prompt for a training session.
 */
export async function buildSystemPrompt({ skillCatalog, userSkill, sessionType = 'training', socialStats = null }) {
  const parts = [];

  // Layer 1: Core Protocol
  parts.push(TRAINING_PROTOCOL);

  // Layer 2: Skill Context
  parts.push(buildSkillContext(skillCatalog));

  // Layer 3: Current State
  parts.push(buildCurrentState(userSkill, socialStats));

  // Layer 3b: Past Problem History (dedup)
  if (userSkill?._id) {
    const history = await buildProblemHistory(userSkill._id);
    if (history) parts.push(history);
  }

  // Layer 4: Session Instructions
  parts.push(buildSessionInstructions(sessionType, userSkill, skillCatalog));

  // Layer 5: Output Format
  parts.push(buildOutputFormat(sessionType));

  return parts.filter(Boolean).join('\n\n');
}

function buildSkillContext(skillCatalog) {
  if (!skillCatalog) return '';

  const lines = [];
  const category = skillCatalog.category || 'technology';

  if (skillCatalog.trainingContext) {
    lines.push(`## Skill: ${skillCatalog.name} (Category: ${category})\n\n${skillCatalog.trainingContext}`);
  } else {
    lines.push(`## Skill: ${skillCatalog.name} (Category: ${category})\n\nThis is a new skill being onboarded. No training context has been established yet. You will need to generate one during the onboarding session using the set_training_context tool.`);
  }

  if (!isTechCategory(category)) {
    lines.push(`\n**This is NOT a programming skill.** Do NOT use the code editor. When calling \`present_problem\`, set \`starter_code\` to an empty string and \`language\` to an empty string. Present all challenges as text descriptions in your chat message. The student will respond via chat, not code.`);
  }

  return lines.join('\n');
}

function buildCurrentState(userSkill, socialStats) {
  if (!userSkill) return '';

  const lines = ['## Current Student State'];
  lines.push(`- Current Belt: **${userSkill.currentBelt}**`);
  lines.push(`- Assessment Available: ${userSkill.assessmentAvailable ? 'Yes' : 'No'}`);

  const concepts = userSkill.concepts || new Map();
  if (concepts.size > 0) {
    lines.push(`- Tracked Concepts: ${concepts.size}`);

    // Show concept summary grouped by mastery level
    const strong = [];
    const developing = [];
    const weak = [];

    for (const [name, data] of concepts) {
      const mastery = applyTimeDecay(data);
      const daysSince = data.lastSeen
        ? Math.round((Date.now() - new Date(data.lastSeen).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const lastStr = daysSince !== null ? `${daysSince}d ago` : 'never';
      const obsCount = data.observations?.length || 0;
      const label = `${name} (${(mastery * 100).toFixed(0)}%, exp:${data.exposureCount || 0}, streak:${data.streak || 0}, last:${lastStr}${obsCount ? `, obs:${obsCount}` : ''})`;
      if (mastery >= 0.8) strong.push(label);
      else if (mastery >= 0.5) developing.push(label);
      else weak.push(label);
    }

    if (strong.length) lines.push(`- Strong: ${strong.join(', ')}`);
    if (developing.length) lines.push(`- Developing: ${developing.join(', ')}`);
    if (weak.length) lines.push(`- Weak: ${weak.join(', ')}`);
  }

  // Reinforcement queue
  const queue = userSkill.reinforcementQueue || [];
  if (queue.length > 0) {
    const queueStr = queue.map(r => `${r.concept} (${r.priority})`).join(', ');
    lines.push(`- Reinforcement Queue: ${queueStr}`);
  }

  // Prioritized concepts for this session
  try {
    const prioritized = getPrioritizedConcepts(userSkill);
    if (prioritized.length > 0) {
      lines.push('\n### Suggested Focus for This Session');
      for (const item of prioritized.slice(0, 5)) {
        lines.push(`- **${item.concept}**: ${item.reason}`);
      }
    }
  } catch {
    // Graceful degradation if spaced repetition fails
  }

  // Social stats (anonymized encouragement data)
  if (socialStats) {
    lines.push('\n### Community Context');
    if (socialStats.totalStudents) {
      lines.push(`- ${socialStats.totalStudents} students are learning this skill`);
    }
    if (socialStats.avgTimeToNextBelt) {
      lines.push(`- Average time to next belt: ${socialStats.avgTimeToNextBelt}`);
    }
    if (socialStats.recentPromotions) {
      lines.push(`- ${socialStats.recentPromotions} students promoted this month`);
    }
  }

  return lines.join('\n');
}

function buildSessionInstructions(sessionType, userSkill, skillCatalog) {
  const isTech = isTechCategory(skillCatalog?.category);
  const editorInstruction = isTech
    ? `always include \`starter_code\` and \`language\` so the student's code editor is pre-filled. ALSO write the full problem in your chat message — the tool does NOT display the problem text to the student`
    : `set \`starter_code\` to an empty string and \`language\` to an empty string (this is not a code skill). Write the full problem in your chat message — the student will respond via chat`;

  switch (sessionType) {
    case 'onboarding':
      return `## Session Type: Onboarding

This is the student's first session with this skill.

Instructions:
1. Welcome them briefly — don't be verbose
2. Do NOT ask them to self-assess their level — observe it through challenges
3. Present 3-5 graduated challenges, starting simple and increasing. Call \`present_problem\` to record metadata for each challenge — ${editorInstruction}
4. After each response, use \`record_observation\` and \`update_mastery\` tools to record data
5. **CRITICAL — Belt Assignment**: When you've observed enough to determine their level, you MUST call the \`set_belt\` tool BEFORE announcing the belt in chat. Never tell the student their belt without calling the tool first — the tool is what actually saves the belt to the database.
6. Use \`set_training_context\` to save skill-specific training context (${isTech ? 'what makes code idiomatic, key concept areas, common anti-patterns, evaluation criteria' : 'key concept areas, common mistakes, evaluation criteria, what good practice looks like'})
7. Use \`complete_session\` when done — this marks the onboarding as finished
8. Be encouraging but honest about where they're starting
9. **Follow the Scaffolding Policy**: When a student's ${isTech ? 'code' : 'response'} has issues, do NOT show them the corrected ${isTech ? 'solution' : 'answer'}. Tell them what's wrong conceptually and let them retry. Only reveal the answer if they explicitly give up. This is critical — even during onboarding, you are assessing their ability to self-correct, not just their first attempt.
10. **Tool Reminder**: Every belt assignment MUST use \`set_belt\`, every observation MUST use \`record_observation\`, and the session MUST end with \`complete_session\`. If you mention a belt, observation, or completion in chat without calling the corresponding tool, the data is LOST.`;

    case 'assessment':
      return `## Session Type: Belt Assessment

The student has requested a belt assessment. This is more rigorous than regular training.

Current belt: ${userSkill?.currentBelt || 'white'}
Testing readiness for: next belt

Instructions:
1. Present 3-5 problems that test breadth AND depth of current belt concepts
2. Problems should be challenging but fair for the current belt level
3. Evaluate strictly — belt promotions should be earned
4. Use all observation and mastery tools for each problem
5. **Follow the Scaffolding Policy**: Never reveal solutions during an assessment. If the student fails a challenge, note the failure and move on to the next challenge. No hints during assessments — this is evaluation mode.
6. After all problems, use \`complete_session\` with honest evaluation
7. **CRITICAL — After calling \`complete_session\`, you MUST write a detailed assessment summary to the student.** The tool result will tell you whether they passed or failed (and if promoted, the new belt). Your final message must include:
   - **Result**: Did they pass or not? If promoted, announce the new belt clearly and celebrate it.
   - **Strengths**: What they demonstrated well during the assessment.
   - **Weaknesses**: Specific areas that need improvement (reference actual problems from the session).
   - **Next steps**: Concrete recommendations — what to practice next, what concepts to focus on, whether to continue training at the current level or prepare for the next assessment.
   - If they failed, be encouraging — explain exactly what gaps remain and how many more sessions they might need before retrying.`;

    case 'kata':
      return `## Session Type: Kata (Maintenance)

Short practice session to maintain skills and prevent decay.

Instructions:
1. Present 1-2 focused problems targeting decayed or weak concepts
2. Keep it quick — this is maintenance, not deep learning
3. Use tools to update mastery and record observations
4. Finish with \`complete_session\``;

    case 'training':
    default:
      return `## Session Type: Training

Regular training session.

Instructions:
1. **Start with a brief check-in** before presenting a problem. Keep it short (2-3 sentences max). Based on context:
   - If this is their first training session after onboarding: "Welcome back! Ready to start practicing? I have a challenge lined up, or if there's something specific you'd like to work on, let me know."
   - If they have previous sessions: Reference where they left off or what they were working on. Ask if they want to continue building on that, tackle weak spots, or try something new.
   - If concepts have decayed since last session: Mention it briefly — "It's been a while since we practiced X — want to do a quick refresher or jump into something new?"
   - Wait for the student's response before presenting a problem. Don't dump a challenge immediately.
2. Review the suggested focus concepts above (if any)
3. Generate a fresh challenge that targets concepts needing reinforcement or new contexts
4. Call \`present_problem\` tool to record the problem metadata — ${editorInstruction}
5. The problem should feel like a real ${isTech ? 'problem' : 'challenge'}, not a textbook exercise
6. Don't hint at which concepts are being tested
7. After the student submits, evaluate their ${isTech ? 'solution' : 'response'}:
   a. ${isTech ? 'Check for inline `QUESTION:` comments and answer them' : 'Review their reasoning and approach'}
   b. Evaluate correctness and ${isTech ? 'code quality' : 'quality of response'}
   c. Use \`record_observation\` for each notable pattern
   d. Use \`update_mastery\` for each concept exercised
   e. Queue reinforcement for weak areas
8. **Follow the Scaffolding Policy**: If the ${isTech ? 'solution' : 'response'} has errors, do NOT show the corrected ${isTech ? 'code' : 'answer'}. Tell them what's wrong, give a hint, and let them try again. Progressively reveal more help on subsequent attempts. Only show the full ${isTech ? 'solution' : 'answer'} if the student explicitly gives up.${isTech ? ' For minor style issues on otherwise correct code, it\'s fine to show the cleaner version.' : ''}
9. Only use \`complete_session\` after the student has either ${isTech ? 'solved the problem correctly' : 'answered correctly'} or explicitly given up`;
  }
}

async function buildProblemHistory(skillId) {
  try {
    const recentSessions = await Session.find({
      skillId,
      'problem.prompt': { $ne: '' },
      status: { $in: ['completed', 'active'] },
    })
      .select('problem.prompt problem.conceptsTargeted evaluation.correctness date')
      .sort({ date: -1 })
      .limit(20)
      .lean();

    if (recentSessions.length === 0) return '';

    const lines = [
      '## Past Problems (DO NOT REPEAT)',
      'The following problems have already been given to this student. You MUST generate a novel, different problem each time. Never reuse the same scenario, theme, or problem shape unless the student explicitly asks to retry one.',
      '',
    ];

    for (const s of recentSessions) {
      const date = new Date(s.date).toISOString().split('T')[0];
      const concepts = s.problem.conceptsTargeted?.join(', ') || 'unspecified';
      const result = s.evaluation?.correctness || 'in-progress';
      // Truncate long prompts to save tokens
      const prompt = s.problem.prompt.length > 150
        ? s.problem.prompt.slice(0, 150) + '...'
        : s.problem.prompt;
      lines.push(`- [${date}] (${result}) [${concepts}]: ${prompt}`);
    }

    return lines.join('\n');
  } catch {
    return '';
  }
}

function buildOutputFormat(sessionType) {
  return `## Output Format

- Communicate naturally with the student — you're a teacher, not a machine
- Use the provided tools to record structured data (observations, mastery, etc.)
- Keep explanations concise but clear
- Use code blocks with appropriate language tags when showing examples
- Format problems clearly with requirements and constraints
- After evaluating a submission, always use \`complete_session\` to finalize`;
}
