import { navigationItems } from "../../app/navigation";
import type { PageKey } from "../../types/common";
import { Icon } from "../ui/Icon";

interface MobileMoreSheetProps {
  activePage: PageKey;
  onClose: () => void;
  onNavigate: (page: PageKey) => void;
}

const morePages: PageKey[] = [
  "memory",
  "projects",
  "decisions",
  "persons",
  "reminders",
  "settings",
];

export function MobileMoreSheet({ activePage, onClose, onNavigate }: MobileMoreSheetProps) {
  const items = navigationItems.filter((item) => morePages.includes(item.key));

  return (
    <div className="mobile-more" role="dialog" aria-label="Mas secciones">
      <button className="mobile-more__scrim" onClick={onClose} type="button" aria-label="Cerrar menu" />
      <div className="mobile-more__panel">
        <div className="mobile-more__header">
          <strong>Mas</strong>
          <button onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
        <div className="mobile-more__grid">
          {items.map((item) => (
            <button
              aria-current={activePage === item.key ? "page" : undefined}
              className={activePage === item.key ? "mobile-more__item mobile-more__item--active" : "mobile-more__item"}
              key={item.key}
              onClick={() => {
                onNavigate(item.key);
                onClose();
              }}
              type="button"
            >
              <Icon name={item.icon} />
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
