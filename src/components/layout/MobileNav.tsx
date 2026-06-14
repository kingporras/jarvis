import { navigationItems } from "../../app/navigation";
import type { PageKey } from "../../types/common";
import { Icon } from "../ui/Icon";

interface MobileNavProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export function MobileNav({ activePage, onNavigate }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Navegacion movil">
      {navigationItems.map((item) => (
        <button
          aria-current={activePage === item.key ? "page" : undefined}
          className={activePage === item.key ? "mobile-nav__item mobile-nav__item--active" : "mobile-nav__item"}
          key={item.key}
          onClick={() => onNavigate(item.key)}
          type="button"
        >
          <Icon className="mobile-nav__icon" name={item.icon} />
          <span>{item.shortLabel}</span>
        </button>
      ))}
    </nav>
  );
}
