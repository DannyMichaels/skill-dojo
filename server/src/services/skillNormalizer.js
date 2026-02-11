import MODELS from '../config/models.js';

const SKILL_MAP = {
  // JavaScript variants
  'js': { name: 'JavaScript', slug: 'javascript', category: 'technology' },
  'javascript': { name: 'JavaScript', slug: 'javascript', category: 'technology' },
  'vanilla js': { name: 'JavaScript', slug: 'javascript', category: 'technology' },
  'es6': { name: 'JavaScript', slug: 'javascript', category: 'technology' },
  'ecmascript': { name: 'JavaScript', slug: 'javascript', category: 'technology' },

  // TypeScript
  'ts': { name: 'TypeScript', slug: 'typescript', category: 'technology' },
  'typescript': { name: 'TypeScript', slug: 'typescript', category: 'technology' },

  // Python
  'python': { name: 'Python', slug: 'python', category: 'technology' },
  'python3': { name: 'Python', slug: 'python', category: 'technology' },
  'py': { name: 'Python', slug: 'python', category: 'technology' },

  // Ruby
  'ruby': { name: 'Ruby', slug: 'ruby', category: 'technology' },
  'rb': { name: 'Ruby', slug: 'ruby', category: 'technology' },

  // Rust
  'rust': { name: 'Rust', slug: 'rust', category: 'technology' },
  'rs': { name: 'Rust', slug: 'rust', category: 'technology' },

  // Go
  'go': { name: 'Go', slug: 'go', category: 'technology' },
  'golang': { name: 'Go', slug: 'go', category: 'technology' },

  // Java
  'java': { name: 'Java', slug: 'java', category: 'technology' },

  // C#
  'c#': { name: 'C#', slug: 'csharp', category: 'technology' },
  'csharp': { name: 'C#', slug: 'csharp', category: 'technology' },
  'c sharp': { name: 'C#', slug: 'csharp', category: 'technology' },

  // C++
  'c++': { name: 'C++', slug: 'cpp', category: 'technology' },
  'cpp': { name: 'C++', slug: 'cpp', category: 'technology' },

  // C
  'c': { name: 'C', slug: 'c', category: 'technology' },

  // SQL
  'sql': { name: 'SQL', slug: 'sql', category: 'technology' },
  'mysql': { name: 'SQL', slug: 'sql', category: 'technology' },
  'postgresql': { name: 'SQL', slug: 'sql', category: 'technology' },
  'postgres': { name: 'SQL', slug: 'sql', category: 'technology' },
  'sqlite': { name: 'SQL', slug: 'sql', category: 'technology' },

  // React
  'react': { name: 'React', slug: 'react', category: 'technology' },
  'react js': { name: 'React', slug: 'react', category: 'technology' },
  'reactjs': { name: 'React', slug: 'react', category: 'technology' },
  'react.js': { name: 'React', slug: 'react', category: 'technology' },

  // Node.js
  'node': { name: 'Node.js', slug: 'nodejs', category: 'technology' },
  'nodejs': { name: 'Node.js', slug: 'nodejs', category: 'technology' },
  'node.js': { name: 'Node.js', slug: 'nodejs', category: 'technology' },
  'node js': { name: 'Node.js', slug: 'nodejs', category: 'technology' },

  // PHP
  'php': { name: 'PHP', slug: 'php', category: 'technology' },

  // Swift
  'swift': { name: 'Swift', slug: 'swift', category: 'technology' },

  // Kotlin
  'kotlin': { name: 'Kotlin', slug: 'kotlin', category: 'technology' },
  'kt': { name: 'Kotlin', slug: 'kotlin', category: 'technology' },

  // Scala
  'scala': { name: 'Scala', slug: 'scala', category: 'technology' },

  // Elixir
  'elixir': { name: 'Elixir', slug: 'elixir', category: 'technology' },
  'ex': { name: 'Elixir', slug: 'elixir', category: 'technology' },

  // Haskell
  'haskell': { name: 'Haskell', slug: 'haskell', category: 'technology' },
  'hs': { name: 'Haskell', slug: 'haskell', category: 'technology' },

  // Clojure
  'clojure': { name: 'Clojure', slug: 'clojure', category: 'technology' },
  'clj': { name: 'Clojure', slug: 'clojure', category: 'technology' },

  // Lua
  'lua': { name: 'Lua', slug: 'lua', category: 'technology' },

  // R
  'r': { name: 'R', slug: 'r', category: 'technology' },
  'rlang': { name: 'R', slug: 'r', category: 'technology' },

  // Dart
  'dart': { name: 'Dart', slug: 'dart', category: 'technology' },
  'flutter': { name: 'Dart', slug: 'dart', category: 'technology' },

  // Vue
  'vue': { name: 'Vue', slug: 'vue', category: 'technology' },
  'vuejs': { name: 'Vue', slug: 'vue', category: 'technology' },
  'vue.js': { name: 'Vue', slug: 'vue', category: 'technology' },
  'vue js': { name: 'Vue', slug: 'vue', category: 'technology' },

  // Angular
  'angular': { name: 'Angular', slug: 'angular', category: 'technology' },
  'angularjs': { name: 'Angular', slug: 'angular', category: 'technology' },

  // Docker
  'docker': { name: 'Docker', slug: 'docker', category: 'technology' },

  // Bash/Shell
  'bash': { name: 'Bash', slug: 'bash', category: 'technology' },
  'shell': { name: 'Bash', slug: 'bash', category: 'technology' },
  'sh': { name: 'Bash', slug: 'bash', category: 'technology' },
  'zsh': { name: 'Bash', slug: 'bash', category: 'technology' },

  // CSS
  'css': { name: 'CSS', slug: 'css', category: 'technology' },
  'css3': { name: 'CSS', slug: 'css', category: 'technology' },
  'scss': { name: 'CSS', slug: 'css', category: 'technology' },
  'sass': { name: 'CSS', slug: 'css', category: 'technology' },

  // HTML
  'html': { name: 'HTML', slug: 'html', category: 'technology' },
  'html5': { name: 'HTML', slug: 'html', category: 'technology' },

  // GraphQL
  'graphql': { name: 'GraphQL', slug: 'graphql', category: 'technology' },
  'gql': { name: 'GraphQL', slug: 'graphql', category: 'technology' },

  // Regex
  'regex': { name: 'Regular Expressions', slug: 'regex', category: 'technology' },
  'regexp': { name: 'Regular Expressions', slug: 'regex', category: 'technology' },
  'regular expressions': { name: 'Regular Expressions', slug: 'regex', category: 'technology' },

  // Zig
  'zig': { name: 'Zig', slug: 'zig', category: 'technology' },

  // OCaml
  'ocaml': { name: 'OCaml', slug: 'ocaml', category: 'technology' },

  // Erlang
  'erlang': { name: 'Erlang', slug: 'erlang', category: 'technology' },

  // Perl
  'perl': { name: 'Perl', slug: 'perl', category: 'technology' },

  // --- Non-technology skills ---

  // Food & Cooking
  'cooking': { name: 'Cooking', slug: 'cooking', category: 'food' },
  'baking': { name: 'Baking', slug: 'baking', category: 'food' },

  // Life Skills
  'car maintenance': { name: 'Car Maintenance', slug: 'car-maintenance', category: 'life' },
  'personal finance': { name: 'Personal Finance', slug: 'personal-finance', category: 'life' },
  'first aid': { name: 'First Aid', slug: 'first-aid', category: 'life' },

  // Music
  'guitar': { name: 'Guitar', slug: 'guitar', category: 'music' },
  'piano': { name: 'Piano', slug: 'piano', category: 'music' },
  'music theory': { name: 'Music Theory', slug: 'music-theory', category: 'music' },

  // Fitness
  'yoga': { name: 'Yoga', slug: 'yoga', category: 'fitness' },
  'weightlifting': { name: 'Weightlifting', slug: 'weightlifting', category: 'fitness' },

  // Language
  'spanish': { name: 'Spanish', slug: 'spanish', category: 'language' },
  'japanese': { name: 'Japanese', slug: 'japanese', category: 'language' },

  // Science
  'chemistry': { name: 'Chemistry', slug: 'chemistry', category: 'science' },
  'physics': { name: 'Physics', slug: 'physics', category: 'science' },

  // Art
  'drawing': { name: 'Drawing', slug: 'drawing', category: 'art' },
  'photography': { name: 'Photography', slug: 'photography', category: 'art' },
};

/**
 * Try to normalize a skill name using the local mapping.
 * Returns { name, slug, category } or null if not found.
 */
export function normalizeLocal(query) {
  const key = query.toLowerCase().trim();
  return SKILL_MAP[key] || null;
}

/**
 * Fallback: use Claude Haiku to normalize an unknown skill name.
 * Returns { name, slug, category, ambiguous }.
 * Throws on failure — caller should handle.
 */
export async function normalizeWithAI(query, anthropicClient) {
  const response = await anthropicClient.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `You are a skill normalizer. Given a user query, return the canonical name, URL-safe slug, and category for the skill they mean. Skills can be anything — programming, cooking, music, fitness, etc.

Query: "${query}"

Categories: technology, life, food, music, fitness, language, science, business, art, other

Respond with ONLY valid JSON (no markdown):
{"name": "Canonical Name", "slug": "lowercase-slug", "category": "technology|life|food|music|fitness|language|science|business|art|other", "ambiguous": false}

If the query is ambiguous (could mean multiple things), set ambiguous to true and pick the most likely match. If it's not a recognizable skill, respond with:
{"name": null, "slug": null, "category": null, "ambiguous": false}`,
      },
    ],
  });

  let text = response.content[0].text.trim();
  // Strip markdown code fences if present (Claude sometimes wraps JSON)
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  return JSON.parse(text);
}

/**
 * Normalize a skill query: try local map first, then AI fallback.
 * Throws if AI is needed but unavailable.
 */
export async function normalize(query, anthropicClient) {
  const local = normalizeLocal(query);
  if (local) return { ...local, ambiguous: false };

  if (!anthropicClient) {
    throw new Error('AI service unavailable — cannot normalize unknown skill. Please try a common skill name.');
  }

  return normalizeWithAI(query, anthropicClient);
}
