import type { SVGProps } from "react";

import { logger } from "@/lib/logger";

const log = logger.child({ file: "components/icons/link.tsx" });

export function Link(props: SVGProps<SVGSVGElement>) {
  log.debug("Rendering link icon", {
    userId: "unknown",
    action: "render_link_icon",
  });

  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
    >
      <title>Link</title>
      <path
        fill="none"
        stroke="currentColor"
        strokeDasharray="28"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 6l2-2c1-1 3-1 4 0l1 1c1 1 1 3 0 4l-5 5c-1 1-3 1-4 0M11 18l-2 2c-1 1-3 1-4 0l-1-1c-1-1-1-3 0-4l5-5c1-1 3-1 4 0"
      >
        <animate
          fill="freeze"
          attributeName="stroke-dashoffset"
          dur="0.6s"
          values="28;0"
        />
      </path>
    </svg>
  );
}

export default Link;
