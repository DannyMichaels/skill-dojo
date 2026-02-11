import { useEffect, useMemo, useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { Rss, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import useAuthStore from '../../features/auth/store/auth.store';
import useSkillStore from '../../features/skills/store/skill.store';
import { APP_NAME, BrandIcon } from '../../constants/app';
import { CATEGORY_ORDER, CATEGORY_META } from '../../constants/categories';
import Avatar from '../../components/shared/Avatar';
import SkillIcon from '../../components/shared/SkillIcon';
import UserSearchBar from '../../features/social/components/UserSearchBar';
import type { UserSkill } from '../../features/skills/types/skill.types';
import './AppLayout.scss';

export default function AppLayout() {
  const { token, user, logout } = useAuthStore();
  const { skills, fetchSkills } = useSkillStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const groupedSkills = useMemo(() => {
    const map = new Map<string, UserSkill[]>();
    for (const skill of skills) {
      const cat = skill.skillCatalogId?.category || 'technology';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(skill);
    }
    const sorted = new Map<string, UserSkill[]>();
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
    if (token) fetchSkills();
  }, [token, fetchSkills]);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="AppLayout">
      <button
        className="AppLayout__hamburger"
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>
      {sidebarOpen && <div className="AppLayout__overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`AppLayout__sidebar ${sidebarOpen ? 'AppLayout__sidebar--open' : ''}`}>
        <div className="AppLayout__brand">
          <BrandIcon size={24} />
          {APP_NAME}
        </div>
        <nav className="AppLayout__nav">
          <Link
            to="/feed"
            className={`AppLayout__link ${location.pathname === '/feed' ? 'AppLayout__link--active' : ''}`}
          >
            <Rss size={16} />
            Feed
          </Link>
          <Link
            to="/dashboard"
            className={`AppLayout__link ${location.pathname === '/dashboard' ? 'AppLayout__link--active' : ''}`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          <div className="AppLayout__search">
            <UserSearchBar compact />
          </div>

          {skills.length > 0 && (
            <div className="AppLayout__skills">
              <span className="AppLayout__skillsLabel">Skills</span>
              {singleCategory ? (
                skills.map(skill => (
                  <Link
                    key={skill._id}
                    to={`/skills/${skill._id}`}
                    className={`AppLayout__link AppLayout__link--skill ${location.pathname === `/skills/${skill._id}` ? 'AppLayout__link--active' : ''}`}
                  >
                    <SkillIcon slug={skill.skillCatalogId?.slug || ''} size={14} category={skill.skillCatalogId?.category} />
                    {skill.skillCatalogId?.name || 'Loading...'}
                  </Link>
                ))
              ) : (
                Array.from(groupedSkills.entries()).map(([cat, catSkills]) => {
                  const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                  return (
                    <div key={cat}>
                      <span className="AppLayout__skillsCategoryLabel">
                        {meta.icon} {meta.label}
                      </span>
                      {catSkills.map(skill => (
                        <Link
                          key={skill._id}
                          to={`/skills/${skill._id}`}
                          className={`AppLayout__link AppLayout__link--skill ${location.pathname === `/skills/${skill._id}` ? 'AppLayout__link--active' : ''}`}
                        >
                          <SkillIcon slug={skill.skillCatalogId?.slug || ''} size={14} category={skill.skillCatalogId?.category} />
                          {skill.skillCatalogId?.name || 'Loading...'}
                        </Link>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </nav>
        <div className="AppLayout__user">
          {user && (
            <Link
              to={`/u/${user.username}`}
              className={`AppLayout__profileLink ${location.pathname === `/u/${user.username}` ? 'AppLayout__profileLink--active' : ''}`}
            >
              <Avatar
                avatar={user.avatar}
                avatarUrl={user.avatarUrl}
                name={user.name}
                username={user.username}
                size="sm"
              />
              <span className="AppLayout__profileName">
                {user.name || user.username}
              </span>
            </Link>
          )}
          <Link
            to="/settings"
            className={`AppLayout__link ${location.pathname === '/settings' ? 'AppLayout__link--active' : ''}`}
          >
            <Settings size={16} />
            Settings
          </Link>
          <button className="AppLayout__logout" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
      <main className="AppLayout__main">
        <Outlet />
      </main>
    </div>
  );
}
