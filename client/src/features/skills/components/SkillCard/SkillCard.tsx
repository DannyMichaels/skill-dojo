import { useNavigate } from 'react-router-dom';
import Card from '../../../../components/shared/Card';
import BeltBadge from '../BeltBadge';
import SkillIcon from '../../../../components/shared/SkillIcon';
import type { UserSkill } from '../../types/skill.types';
import './SkillCard.scss';

interface SkillCardProps {
  skill: UserSkill;
}

export default function SkillCard({ skill }: SkillCardProps) {
  const navigate = useNavigate();
  const catalog = skill.skillCatalogId;
  const conceptCount = skill.concepts ? Object.keys(skill.concepts).length : 0;

  return (
    <Card hoverable onClick={() => navigate(`/skills/${skill._id}`)}>
      <div className="SkillCard">
        <div className="SkillCard__header">
          <SkillIcon slug={catalog.slug} size={20} category={catalog.category} />
          <h3 className="SkillCard__name">{catalog.name}</h3>
          <BeltBadge belt={skill.currentBelt} size="sm" />
        </div>
        <div className="SkillCard__stats">
          <span>{conceptCount} concepts tracked</span>
          {skill.assessmentAvailable && (
            <span className="SkillCard__assess">Assessment ready</span>
          )}
        </div>
      </div>
    </Card>
  );
}
