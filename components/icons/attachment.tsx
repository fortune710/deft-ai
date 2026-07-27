import type { SVGProps } from "react";

import { logger } from "@/lib/logger";

const log = logger.child({ file: "components/icons/attachment.tsx" });

export function AttachmentLine(props: SVGProps<SVGSVGElement>) {
  log.debug("Rendering attachment icon", {
    userId: "unknown",
    action: "render_attachment_icon",
  });

  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
    >
      <title>Attachment</title>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit="10"
        strokeWidth="1.5"
        d="m19.605 10.48.137-.136a4.31 4.31 0 0 0 0-6.086 4.307 4.307 0 0 0-6.086 0l-9.398 9.398a4.307 4.307 0 0 0 0 6.086 4.31 4.31 0 0 0 6.086 0l6.351-6.356a2.35 2.35 0 0 0-1.66-4.008 2.35 2.35 0 0 0-1.66.688l-6.657 6.656"
      />
    </svg>
  );
}

export default AttachmentLine;
