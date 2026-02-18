import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { Rss, LayoutDashboard, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Search, ChevronDown, ChevronRight } from 'lucide-react';
import cn from 'classnames';
import useAuthStore from '../../features/auth/store/auth.store';
import useSkillStore from '../../features/skills/store/skill.store';
import { APP_NAME, BrandIcon } from '../../constants/app';
import { CATEGORY_ORDER, CATEGORY_META } from '../../constants/categories';
import Avatar from '../../components/shared/Avatar';
import SkillIcon from '../../components/shared/SkillIcon';
import Tooltip from '../../components/shared/Tooltip';
import UserSearchBar from '../../features/social/components/UserSearchBar';
import type { UserSkill } from '../../features/skills/types/skill.types';
import './AppLayout.scss';

const SIDEBAR_KEY = 'sidebar-collapsed';
const CATEGORIES_KEY = 'sidebar-collapsed-cats';

function loadCollapsedCats(): Set<string> {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveCollapsedCats(cats: Set<string>) {
  try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify([...cats])); } catch {}
}

export default function AppLayout() {
  const { token, user, logout } = useAuthStore();
  const { skills, fetchSkills } = useSkillStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; }
    catch { return false; }
  });
  const [collapsedCats, setCollapsedCats] = useState(loadCollapsedCats);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchPopRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch {}
      return next;
    });
  };

  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      saveCollapsedCats(next);
      return next;
    });
  }, []);

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

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Close search popover on outside click
  useEffect(() => {
    if (!searchOpen) return;
    function handleClick(e: MouseEvent) {
      if (searchPopRef.current && !searchPopRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [searchOpen]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return (
    <div className={cn('AppLayout', { 'AppLayout--collapsed': collapsed })}>
      <button
        className="AppLayout__hamburger"
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>
      {sidebarOpen && <div className="AppLayout__overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn('AppLayout__sidebar', { 'AppLayout__sidebar--open': sidebarOpen })}>
        {/* Brand + collapse toggle */}
        <div className="AppLayout__brandRow">
          <div className="AppLayout__brand">
            <BrandIcon size={24} />
            <span className="AppLayout__brandText">{APP_NAME}</span>
          </div>
          <button
            className="AppLayout__collapseBtn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Search — outside nav to avoid overflow clipping */}
        <div className="AppLayout__search" ref={searchPopRef}>
          {collapsed ? (
            <>
              <Tooltip label="Search users" disabled={!collapsed}>
                <button
                  className="AppLayout__searchIconLink"
                  onClick={() => setSearchOpen(prev => !prev)}
                  aria-label="Search users"
                >
                  <Search size={18} />
                </button>
              </Tooltip>
              {searchOpen && (
                <div className="AppLayout__searchPopover">
                  <UserSearchBar compact />
                </div>
              )}
            </>
          ) : (
            <UserSearchBar compact />
          )}
        </div>

        {/* Scrollable nav */}
        <nav className="AppLayout__nav">
          <Tooltip label="Feed" disabled={!collapsed}>
            <Link
              to="/feed"
              className={cn('AppLayout__link', { 'AppLayout__link--active': location.pathname === '/feed' })}
            >
              <Rss size={16} />
              <span className="AppLayout__linkText">Feed</span>
            </Link>
          </Tooltip>
          <Tooltip label="Dashboard" disabled={!collapsed}>
            <Link
              to="/dashboard"
              className={cn('AppLayout__link', { 'AppLayout__link--active': location.pathname === '/dashboard' })}
            >
              <LayoutDashboard size={16} />
              <span className="AppLayout__linkText">Dashboard</span>
            </Link>
          </Tooltip>

          {skills.length > 0 && (
            <div className="AppLayout__skills">
              <span className="AppLayout__skillsLabel">Skills</span>
              {singleCategory ? (
                skills.map(skill => (
                  <Tooltip key={skill._id} label={skill.skillCatalogId?.name || 'Skill'} disabled={!collapsed}>
                    <Link
                      to={`/skills/${skill._id}`}
                      className={cn('AppLayout__link AppLayout__link--skill', {
                        'AppLayout__link--active': location.pathname === `/skills/${skill._id}`,
                      })}
                    >
                      <SkillIcon slug={skill.skillCatalogId?.slug || ''} size={14} category={skill.skillCatalogId?.category} />
                      <span className="AppLayout__linkText">{skill.skillCatalogId?.name || 'Loading...'}</span>
                    </Link>
                  </Tooltip>
                ))
              ) : (
                Array.from(groupedSkills.entries()).map(([cat, catSkills]) => {
                  const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                  const isCatCollapsed = collapsedCats.has(cat);
                  return (
                    <div key={cat} className="AppLayout__skillsCategory">
                      <button
                        className="AppLayout__skillsCategoryLabel"
                        onClick={() => toggleCategory(cat)}
                        aria-expanded={!isCatCollapsed}
                      >
                        {collapsed ? (
                          <Tooltip label={meta.label} disabled={!collapsed}>
                            <span className="AppLayout__skillsCategoryIcon">
                              {isCatCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                            </span>
                          </Tooltip>
                        ) : (
                          <>
                            <span className="AppLayout__skillsCategoryChevron">
                              {isCatCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                            </span>
                            <span className="AppLayout__skillsCategoryText">
                              {meta.icon} {meta.label}
                            </span>
                          </>
                        )}
                      </button>
                      {!isCatCollapsed && catSkills.map(skill => (
                        <Tooltip key={skill._id} label={skill.skillCatalogId?.name || 'Skill'} disabled={!collapsed}>
                          <Link
                            to={`/skills/${skill._id}`}
                            className={cn('AppLayout__link AppLayout__link--skill', {
                              'AppLayout__link--active': location.pathname === `/skills/${skill._id}`,
                            })}
                          >
                            <SkillIcon slug={skill.skillCatalogId?.slug || ''} size={14} category={skill.skillCatalogId?.category} />
                            <span className="AppLayout__linkText">{skill.skillCatalogId?.name || 'Loading...'}</span>
                          </Link>
                        </Tooltip>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </nav>

        {/* User section — pinned bottom */}
        <div className="AppLayout__user">
          {user && (
            <Tooltip label={user.name || user.username} disabled={!collapsed}>
              <Link
                to={`/u/${user.username}`}
                className={cn('AppLayout__profileLink', {
                  'AppLayout__profileLink--active': location.pathname === `/u/${user.username}`,
                })}
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
            </Tooltip>
          )}
          <Tooltip label="Settings" disabled={!collapsed}>
            <Link
              to="/settings"
              className={cn('AppLayout__link', { 'AppLayout__link--active': location.pathname === '/settings' })}
            >
              <Settings size={16} />
              <span className="AppLayout__linkText">Settings</span>
            </Link>
          </Tooltip>
          <Tooltip label="Logout" disabled={!collapsed}>
            <button className="AppLayout__logout" onClick={logout}>
              <LogOut size={16} />
              <span className="AppLayout__linkText">Logout</span>
            </button>
          </Tooltip>
        </div>
      </aside>

      <main className="AppLayout__main">
        <Outlet />
      </main>
    </div>
  );
}
