import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import useAuthStore from '../../auth/store/auth.store';
import useSkillStore from '../../skills/store/skill.store';
import SkillCard from '../../skills/components/SkillCard';
import AddSkillDialog from '../../skills/components/AddSkillDialog';
import Button from '../../../components/shared/Button';
import Spinner from '../../../components/shared/Spinner';
import { CATEGORY_ORDER, CATEGORY_META } from '../../../constants/categories';
import type { UserSkill } from '../../skills/types/skill.types';
import './DashboardScreen.scss';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { skills, loading, fetchSkills } = useSkillStore();
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const grouped = useMemo(() => {
    const map = new Map<string, UserSkill[]>();
    for (const skill of skills) {
      const cat = skill.skillCatalogId?.category || 'technology';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(skill);
    }
    // Sort by CATEGORY_ORDER
    const sorted = new Map<string, UserSkill[]>();
    for (const cat of CATEGORY_ORDER) {
      if (map.has(cat)) sorted.set(cat, map.get(cat)!);
    }
    // Any remaining categories not in the order
    for (const [cat, skills] of map) {
      if (!sorted.has(cat)) sorted.set(cat, skills);
    }
    return sorted;
  }, [skills]);

  const singleCategory = grouped.size <= 1;

  const toggle = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="DashboardScreen">
      <div className="DashboardScreen__header">
        <h1 className="DashboardScreen__title">
          Welcome, {user?.name || user?.username || 'Student'}
        </h1>
        <Button onClick={() => setShowAddSkill(true)}>New Skill</Button>
      </div>
      <p className="DashboardScreen__subtitle">
        Your training skills will appear here. Start by adding a new skill.
      </p>

      {loading ? (
        <div className="DashboardScreen__loading">
          <Spinner size="md" />
        </div>
      ) : skills.length === 0 ? (
        <div className="DashboardScreen__empty">
          No skills yet. Start training to begin your journey.
        </div>
      ) : singleCategory ? (
        <div className="DashboardScreen__grid">
          {skills.map((skill) => (
            <SkillCard key={skill._id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="DashboardScreen__categories">
          {Array.from(grouped.entries()).map(([cat, catSkills]) => {
            const meta = CATEGORY_META[cat] || CATEGORY_META.other;
            const isOpen = !collapsed[cat];

            return (
              <div key={cat} className="DashboardScreen__category">
                <button
                  className="DashboardScreen__categoryHeader"
                  onClick={() => toggle(cat)}
                  type="button"
                >
                  <span className="DashboardScreen__categoryLabel">
                    {meta.icon} {meta.label}
                  </span>
                  <span className="DashboardScreen__categoryCount">
                    {catSkills.length}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`DashboardScreen__chevron${isOpen ? ' DashboardScreen__chevron--open' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="DashboardScreen__grid">
                    {catSkills.map((skill) => (
                      <SkillCard key={skill._id} skill={skill} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddSkillDialog
        open={showAddSkill}
        onClose={() => setShowAddSkill(false)}
        onAdded={(skillId, onboardingSessionId) => {
          setShowAddSkill(false);
          navigate(`/train/${skillId}/${onboardingSessionId}`);
        }}
      />
    </div>
  );
}
