// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ContentTransition from "./ContentTransition";

afterEach(cleanup);

describe("ContentTransition", () => {
  it("mounts the next view immediately while retaining the outgoing view", () => {
    const { rerender } = render(<ContentTransition viewKey="public"><button>Public library</button></ContentTransition>);
    rerender(<ContentTransition viewKey="link"><button>Paste link</button></ContentTransition>);
    expect(screen.getByRole("button", { name: "Paste link" })).toBeInTheDocument();
    const outgoing = screen.getByText("Public library").closest("[inert]");
    expect(outgoing).toHaveAttribute("aria-hidden", "true");
    expect(outgoing).toHaveStyle({ pointerEvents: "none" });
  });

  it("keeps the latest view interactive during rapid consecutive switches", () => {
    const { rerender } = render(<ContentTransition viewKey="public"><button>Public library</button></ContentTransition>);
    rerender(<ContentTransition viewKey="link"><button>Paste link</button></ContentTransition>);
    rerender(<ContentTransition viewKey="youtube"><button>YouTube library</button></ContentTransition>);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "YouTube library" })).toBeInTheDocument();
    expect(screen.getByText("Public library")).toBeInTheDocument();
  });

  it("updates data within the same view without creating an outgoing pane", () => {
    const { rerender } = render(<ContentTransition viewKey="public"><p>Loading</p></ContentTransition>);
    rerender(<ContentTransition viewKey="public"><p>Loaded library</p></ContentTransition>);
    expect(screen.queryByText("Loading")).toBeNull();
    expect(screen.getByText("Loaded library").closest("[inert]")).toBeNull();
  });
});
