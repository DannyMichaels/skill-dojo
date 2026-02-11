import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicProfile, getPublicSkills } from '../services/profile.service';
import { isFollowing as checkIsFollowing } from '../../social/services/social.service';
import useAuthStore from '../../auth/store/auth.store';
import Avatar from '../../../components/shared/Avatar';
import BeltBadge from '../../skills/components/BeltBadge';
import SkillIcon from '../../../components/shared/SkillIcon';
import ConceptList from '../../skills/components/ConceptList';
import Spinner from '../../../components/shared/Spinner';
import { ChevronDown } from 'lucide-react';
import FollowButton from '../components/FollowButton';
import AvatarUpload from '../components/AvatarUpload';
import FollowListModal from '../components/FollowListModal';
import { CATEGORY_ORDER, CATEGORY_META } from '../../../constants/categories';
import type { Belt } from '../../skills/types/skill.types';
import type { PublicProfile, PublicSkill } from '../types/profile.types';
import './PublicProfileScreen.scss';

export default function PublicProfileScreen() {
  const { username } = useParams<{ username: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [skills, setSkills] = useState<PublicSkill[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [followModal, setFollowModal] = useState<{ open: boolean; mode: 'followers' | 'following' }>({
    open: false,
    mode: 'followers',
  });

  const isOwnProfile = currentUser?.username === username;

  const groupedSkills = useMemo(() => {
    const map = new Map<string, PublicSkill[]>();
    for (const skill of skills) {
      const cat = skill.skillCatalogId?.category || 'technology';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(skill);
    }
    const sorted = new Map<string, PublicSkill[]>();
    for (const cat of CATEGORY_ORDER) {
      if (map.has(cat)) sorted.set(cat, map.get(cat)!);
    }
    for (const [cat, catSkills] of map) {
      if (!sorted.has(cat)) sorted.set(cat, catSkills);
    }
    return sorted;
  }, [skills]);

  const singleCategory = groupedSkills.size <= 1;

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const [p, s] = await Promise.all([
          getPublicProfile(username!),
          getPublicSkills(username!),
        ]);
        setProfile(p);
        setSkills(s);

        if (!isOwnProfile && p._id) {
          const following = await checkIsFollowing(p._id);
          setIsFollowing(following);
        }
      } catch {
        setError('User not found');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username, isOwnProfile]);

  if (loading) {
    return (
      <div className="PublicProfileScreen PublicProfileScreen--loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="PublicProfileScreen PublicProfileScreen--error">
        <p>{error || 'User not found'}</p>
      </div>
    );
  }

  const handleFollowToggle = (following: boolean) => {
    setIsFollowing(following);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            followerCount: prev.followerCount + (following ? 1 : -1),
          }
        : prev,
    );
  };

  return (
    <div className="PublicProfileScreen">
      <div className="PublicProfileScreen__header">
        <div className="PublicProfileScreen__avatarWrap">
          {isOwnProfile ? (
            <AvatarUpload
              avatar={currentUser?.avatar}
              avatarUrl={currentUser?.avatarUrl}
              name={profile.name}
              username={profile.username}
            />
          ) : (
            <Avatar
              avatar={profile.avatar}
              avatarUrl={profile.avatarUrl}
              name={profile.name}
              username={profile.username}
              size="xl"
            />
          )}
        </div>

        <div className="PublicProfileScreen__info">
          <div className="PublicProfileScreen__nameRow">
            <h1>{profile.name || profile.username}</h1>
            {!isOwnProfile && (
              <FollowButton
                userId={profile._id}
                initialIsFollowing={isFollowing}
                onToggle={handleFollowToggle}
              />
            )}
            {isOwnProfile && (
              <Link to="/settings" className="PublicProfileScreen__editLink">
                Edit Profile
              </Link>
            )}
          </div>
          <span className="PublicProfileScreen__username">@{profile.username}</span>
          {profile.bio && <p className="PublicProfileScreen__bio">{profile.bio}</p>}

          <div className="PublicProfileScreen__stats">
            <span className="PublicProfileScreen__stat">
              <strong>{profile.skillCount}</strong> skills
            </span>
            {profile.highestBelt && (
              <span className="PublicProfileScreen__stat">
                <BeltBadge belt={profile.highestBelt as Belt} />
              </span>
            )}
            <span className="PublicProfileScreen__stat">
              <strong>{profile.currentStreak}</strong> day streak
            </span>
            <span className="PublicProfileScreen__stat">
              Joined {new Date(profile.created).toLocaleDateString()}
            </span>
          </div>

          <div className="PublicProfileScreen__followCounts">
            <button
              className="PublicProfileScreen__followCount"
              onClick={() => setFollowModal({ open: true, mode: 'followers' })}
            >
              <strong>{profile.followerCount}</strong> followers
            </button>
            <button
              className="PublicProfileScreen__followCount"
              onClick={() => setFollowModal({ open: true, mode: 'following' })}
            >
              <strong>{profile.followingCount}</strong> following
            </button>
          </div>
        </div>
      </div>

      <h2 className="PublicProfileScreen__sectionTitle">
        Skills ({skills.length})
      </h2>

      {skills.length === 0 ? (
        <p className="PublicProfileScreen__empty">No public skills yet.</p>
      ) : singleCategory ? (
        <div className="PublicProfileScreen__skills">
          {skills.map((skill) => (
            <div key={skill._id}>
              <div
                className={`PublicProfileScreen__skillCard ${expandedSkillId === skill._id ? 'PublicProfileScreen__skillCard--expanded' : ''}`}
                onClick={() => setExpandedSkillId((prev) => (prev === skill._id ? null : skill._id))}
              >
                <SkillIcon slug={skill.skillCatalogId.slug} size={20} category={skill.skillCatalogId.category} />
                <span className="PublicProfileScreen__skillName">
                  {skill.skillCatalogId.name}
                </span>
                <BeltBadge belt={skill.currentBelt as Belt} />
                <ChevronDown className="PublicProfileScreen__expandIcon" />
              </div>
              {expandedSkillId === skill._id && skill.concepts && (
                <div className="PublicProfileScreen__skillDetails">
                  <ConceptList concepts={skill.concepts} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="PublicProfileScreen__categories">
          {Array.from(groupedSkills.entries()).map(([cat, catSkills]) => {
            const meta = CATEGORY_META[cat] || CATEGORY_META.other;
            return (
              <div key={cat} className="PublicProfileScreen__categoryGroup">
                <h3 className="PublicProfileScreen__categoryLabel">
                  {meta.icon} {meta.label}
                </h3>
                <div className="PublicProfileScreen__skills">
                  {catSkills.map((skill) => (
                    <div key={skill._id}>
                      <div
                        className={`PublicProfileScreen__skillCard ${expandedSkillId === skill._id ? 'PublicProfileScreen__skillCard--expanded' : ''}`}
                        onClick={() => setExpandedSkillId((prev) => (prev === skill._id ? null : skill._id))}
                      >
                        <SkillIcon slug={skill.skillCatalogId.slug} size={20} category={skill.skillCatalogId.category} />
                        <span className="PublicProfileScreen__skillName">
                          {skill.skillCatalogId.name}
                        </span>
                        <BeltBadge belt={skill.currentBelt as Belt} />
                        <ChevronDown className="PublicProfileScreen__expandIcon" />
                      </div>
                      {expandedSkillId === skill._id && skill.concepts && (
                        <div className="PublicProfileScreen__skillDetails">
                          <ConceptList concepts={skill.concepts} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FollowListModal
        open={followModal.open}
        userId={profile._id}
        mode={followModal.mode}
        onClose={() => setFollowModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
