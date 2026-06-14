import type { SVGProps } from "react";
import type { NavIcon } from "../../types/common";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: NavIcon;
}

const paths: Record<NavIcon, string[]> = {
  dashboard: [
    "M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Z",
    "M13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16h-4A1.5 1.5 0 0 1 13 14.5v-9Z",
    "M4 14.5A1.5 1.5 0 0 1 5.5 13h4A1.5 1.5 0 0 1 11 14.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Z"
  ],
  chat: [
    "M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v5A2.5 2.5 0 0 1 16.5 14H11l-4.5 4v-4A2.5 2.5 0 0 1 4 11.5v-5Z"
  ],
  memory: [
    "M12 4v16",
    "M8 5.5A3 3 0 0 0 5 8.5v7A3 3 0 0 0 8 18.5",
    "M16 5.5a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3",
    "M7 10h10",
    "M7 14h10"
  ],
  projects: [
    "M4 6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5v7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5v-9Z",
    "M8 12h8"
  ],
  tasks: [
    "M5 7h14",
    "M5 12h14",
    "M5 17h14",
    "M4 7h.01",
    "M4 12h.01",
    "M4 17h.01"
  ],
  decisions: [
    "M12 4 20 18H4L12 4Z",
    "M12 9v4",
    "M12 16h.01"
  ],
  persons: [
    "M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M4 19a5.5 5.5 0 0 1 11 0",
    "M17 10a2.5 2.5 0 1 0 0-5",
    "M16 15.5A4.5 4.5 0 0 1 20 19"
  ],
  reminders: [
    "M6 8a6 6 0 1 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9Z",
    "M9.5 20a2.5 2.5 0 0 0 5 0"
  ],
  settings: [
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M19 12a7.1 7.1 0 0 0-.08-1.05l2.08-1.62-2-3.46-2.47 1a7.43 7.43 0 0 0-1.83-1.06L14.33 3h-4l-.37 2.81a7.43 7.43 0 0 0-1.83 1.06l-2.47-1-2 3.46 2.08 1.62a7.1 7.1 0 0 0 0 2.1L3.66 14.67l2 3.46 2.47-1a7.43 7.43 0 0 0 1.83 1.06l.37 2.81h4l.37-2.81a7.43 7.43 0 0 0 1.83-1.06l2.47 1 2-3.46-2.08-1.62c.05-.34.08-.69.08-1.05Z"
  ]
};

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name].map((path) => (
        <path
          d={path}
          key={path}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      ))}
    </svg>
  );
}
