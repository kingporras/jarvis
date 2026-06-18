import { useState } from "react";
import { navigationItems } from "../../app/navigation";
import type { PageKey } from "../../types/common";
import { Icon } from "../ui/Icon";
import { MobileMoreSheet } from "./MobileMoreSheet";

interface MobileNavProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export function MobileNav({ activePage, onNavigate }: MobileNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const primaryPages: PageKey[] = ["dashboard", "chat", "tasks"];
  const primaryItems = navigationItems.filter((item) => primaryPages.includes(item.key));
  const isSecondaryActive = !primaryPages.includes(activePage);

  return (
    <>
      <nav className="mobile-nav" aria-label="Navegacion movil">
        {primaryItems.map((item) => (
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
        <button
          aria-expanded={isMoreOpen}
          className={isSecondaryActive || isMoreOpen ? "mobile-nav__item mobile-nav__item--active" : "mobile-nav__item"}
          onClick={() => setIsMoreOpen((current) => !current)}
          type="button"
        >
          <span className="mobile-nav__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Mas</span>
        </button>
      </nav>
      {isMoreOpen ? (
        <MobileMoreSheet
          activePage={activePage}
          onClose={() => setIsMoreOpen(false)}
          onNavigate={onNavigate}
        />
      ) : null}
    </>
  );
}
