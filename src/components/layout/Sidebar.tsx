import { navigationItems } from "../../app/navigation";
import type { PageKey } from "../../types/common";
import { Icon } from "../ui/Icon";

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Navegacion principal">
      <div className="sidebar__brand">
        <span className="brand-mark" aria-hidden="true">
          J
        </span>
        <div>
          <strong>JARVIS</strong>
          <span>Sistema privado</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navigationItems.map((item) => (
          <button
            aria-current={activePage === item.key ? "page" : undefined}
            className={activePage === item.key ? "nav-item nav-item--active" : "nav-item"}
            key={item.key}
            onClick={() => onNavigate(item.key)}
            type="button"
          >
            <Icon className="nav-item__icon" name={item.icon} />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
