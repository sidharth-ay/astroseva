import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * The auth gate asked `/me` on every hard navigation while the backend counts
 * that endpoint per IP, so a user who loaded one page too many in a minute got
 * a 429 -- and the gate read *any* failure as "your session is over": it wiped
 * the token and dumped them on /login. A rate limit is not an authentication
 * answer. Only 401 should ever end a session.
 */

const { getMe, clearSession, replace, router } = vi.hoisted(() => {
  const replace = vi.fn();
  return {
    getMe: vi.fn(),
    clearSession: vi.fn(),
    replace,
    router: { replace },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => router,
}));

vi.mock("@/lib/api", () => ({
  api: { getMe: getMe },
  getToken: () => "tok-123",
  clearSession: clearSession,
}));

async function mountGate() {
  const { default: AuthGate } = await import("./AuthGate");
  return render(
    <AuthGate>
      <div data-testid="protected">protected content</div>
    </AuthGate>,
  );
}

function rejectWith(status?: number) {
  const err = new Error(status === 429 ? "Too many requests" : "Unauthorized") as Error & {
    status?: number;
  };
  err.status = status;
  return err;
}

describe("AuthGate", () => {
  it("keeps the session when /me is only rate-limited", async () => {
    getMe.mockRejectedValueOnce(rejectWith(429));

    await mountGate();

    await waitFor(() => expect(screen.getByTestId("protected")).toBeInTheDocument());
    expect(clearSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the session when the server errors", async () => {
    getMe.mockRejectedValueOnce(rejectWith(503));

    await mountGate();

    await waitFor(() => expect(screen.getByTestId("protected")).toBeInTheDocument());
    expect(clearSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("clears the session and redirects only on a real 401", async () => {
    getMe.mockRejectedValueOnce(rejectWith(401));

    await mountGate();

    await waitFor(() => expect(clearSession).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fprofile");
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });
});
