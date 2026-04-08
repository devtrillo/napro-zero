import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useState,
} from "react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { ZeroProvider } from "@rocicorp/zero/react";
import { formatDate } from "./date";
import { useInterval } from "./use-interval";
import { queries } from "../shared/queries";
import type { Schema } from "../shared/schema";
import type { AppSession } from "../shared/auth";
import { randomMessage } from "./test-data";
import { mutators } from "../shared/mutators";
import { Status } from "./Status";
import { authClient } from "./auth-client";
import { schema } from "../shared/schema";
import { must } from "../shared/must";

const cacheURL = must(
  import.meta.env.VITE_PUBLIC_ZERO_CACHE_URL,
  "required env var VITE_PUBLIC_ZERO_CACHE_URL"
);

function SignInScreen() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "magic-link" | "github" | "passkey" | null
  >(null);

  const handleMagicLink = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPendingAction("magic-link");
    setError(null);
    setMessage(null);
    try {
      await authClient.signIn.magicLink({
        email,
        name,
        callbackURL: window.location.origin,
      });
      setMessage("Check your email for a sign-in link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send magic link.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleGitHub = async () => {
    setPendingAction("github");
    setError(null);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: window.location.origin,
    });
  };

  const handlePasskey = async () => {
    setPendingAction("passkey");
    setError(null);
    const result = await authClient.signIn.passkey({
      autoFill: true,
    });
    if (result.error) {
      setError(result.error.message ?? "Unable to sign in with passkey.");
      setPendingAction(null);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Passwordless only</p>
        <h1>Sign in to Napro Zero</h1>
        <p className="auth-copy">
          Use a magic link, GitHub, or an enrolled passkey. Passwords are not supported.
        </p>
        <form className="auth-form" onSubmit={handleMagicLink}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Name
            <input
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              required
              value={name}
            />
          </label>
          <button disabled={pendingAction !== null} type="submit">
            {pendingAction === "magic-link" ? "Sending..." : "Email me a sign-in link"}
          </button>
        </form>
        <div className="auth-actions">
          <button disabled={pendingAction !== null} onClick={handleGitHub} type="button">
            {pendingAction === "github" ? "Redirecting..." : "Continue with GitHub"}
          </button>
          <button disabled={pendingAction !== null} onClick={handlePasskey} type="button">
            {pendingAction === "passkey" ? "Waiting for passkey..." : "Sign in with passkey"}
          </button>
        </div>
        {message ? <p className="auth-message">{message}</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}
      </div>
    </div>
  );
}

function AuthedApp({ appSession }: { appSession: AppSession }) {
  const zeroOptions = {
    cacheURL,
    context: {
      userID: appSession.appUser.id,
    },
    mutators,
    queries,
    schema,
    userID: appSession.appUser.id,
  };

  return (
    <ZeroProvider {...zeroOptions}>
      <MessagesApp appSession={appSession} />
    </ZeroProvider>
  );
}

function MessagesApp({ appSession }: { appSession: AppSession }) {
  const z = useZero<Schema>();
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterText, setFilterText] = useState<string>("");
  const [action, setAction] = useState<"add" | "remove" | undefined>(undefined);
  const [authAction, setAuthAction] = useState<"logout" | "passkey" | null>(null);

  // Use Zero queries
  const [users] = useQuery(queries.users());
  const [allMessages] = useQuery(queries.messages());
  const [filteredMessages] = useQuery(
    queries.filteredMessages({
      senderID: filterUser,
      body: filterText,
    })
  );

  const hasFilters = filterUser ?? filterText;

  useInterval(
    () => {
      if (!handleAction()) {
        setAction(undefined);
      }
    },
    action !== undefined ? 1000 / 60 : null
  );

  const handleAction = () => {
    if (action === undefined) {
      return false;
    }
    if (action === "add") {
      z.mutate(mutators.message.create(randomMessage()));
      return true;
    } else {
      // Remove the most recent message
      if (filteredMessages.length > 0) {
        z.mutate(mutators.message.delete({ id: filteredMessages[0].id }));
      }
      return true;
    }
  };

  const addMessages = () => setAction("add");

  const removeMessages = () => {
    setAction("remove");
  };

  const stopAction = () => setAction(undefined);

  const editMessage = (
    e: MouseEvent,
    id: string,
    senderID: string,
    prev: string
  ) => {
    if (senderID !== z.userID && !e.shiftKey) {
      alert(
        "You aren't logged in as the sender of this message. Editing won't be permitted. Hold the shift key to try anyway."
      );
      return;
    }
    const body = prompt("Edit message", prev);
    if (body !== null && body !== prev) {
      z.mutate(mutators.message.update({ id, body }));
    }
  };

  const logout = async () => {
    setAuthAction("logout");
    await authClient.signOut();
    location.reload();
  };

  const addPasskey = async () => {
    setAuthAction("passkey");
    const result = await authClient.passkey.addPasskey({
      name: `${navigator.platform} passkey`,
      authenticatorAttachment: "platform",
    });
    if (result.error) {
      alert(result.error.message);
    } else {
      alert("Passkey added.");
    }
    setAuthAction(null);
  };

  // If initial sync hasn't completed, these can be empty.
  if (!users.length) {
    return null;
  }

  const user = users.find((user) => user.id === z.userID)?.name ?? appSession.user.name;

  return (
    <>
      <div className="controls">
        <div>
          <button onMouseDown={addMessages} onMouseUp={stopAction}>
            Add Messages
          </button>
          <button onMouseDown={removeMessages} onMouseUp={stopAction}>
            Remove Messages
          </button>
          <em>(hold buttons to repeat)</em>
        </div>
        <div
          style={{
            justifyContent: "end",
          }}
        >
          <Status />
          <span>{`Signed in as ${user}`}</span>
          <span>{appSession.user.email}</span>
          <button disabled={authAction !== null} onClick={addPasskey} type="button">
            {authAction === "passkey" ? "Adding passkey..." : "Add passkey"}
          </button>
          <button disabled={authAction !== null} onClick={logout} type="button">
            {authAction === "logout" ? "Signing out..." : "Logout"}
          </button>
        </div>
      </div>
      <div className="controls">
        <div>
          From:
          <select
            onChange={(e) => setFilterUser(e.target.value)}
            style={{ flex: 1 }}
          >
            <option key={""} value="">
              Sender
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          Contains:
          <input
            type="text"
            placeholder="message"
            onChange={(e) => setFilterText(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </div>
      <div className="controls">
        <em>
          {!hasFilters ? (
            <>Showing all {filteredMessages.length} messages</>
          ) : (
            <>
              Showing {filteredMessages.length} of {allMessages.length}{" "}
              messages. Try opening{" "}
              <a href="/" target="_blank">
                another tab
              </a>{" "}
              to see them all!
            </>
          )}
        </em>
      </div>
      {filteredMessages.length === 0 ? (
        <h3>
          <em>No posts found 😢</em>
        </h3>
      ) : (
        <table border={1} cellSpacing={0} cellPadding={6} width="100%">
          <thead>
            <tr>
              <th>Sender</th>
              <th>Message</th>
              <th>Sent</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {filteredMessages.map((message) => (
              <tr key={message.id}>
                <td align="left">{message.sender?.name}</td>
                <td align="left">{message.body}</td>
                <td align="right">{formatDate(message.timestamp)}</td>
                <td
                  onMouseDown={(e) =>
                    editMessage(e, message.id, message.senderID, message.body)
                  }
                >
                  ✏️
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function App() {
  const { data: session, isPending } = authClient.useSession();
  const [appSession, setAppSession] = useState<AppSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setAppSession(null);
      setLoadingSession(false);
      setSessionError(null);
      return;
    }

    let cancelled = false;
    setLoadingSession(true);
    setSessionError(null);

    void fetch("/api/session")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load app session.");
        }
        return (await response.json()) as AppSession;
      })
      .then((data) => {
        if (!cancelled) {
          setAppSession(data);
          setLoadingSession(false);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setSessionError(error.message);
          setLoadingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (isPending || loadingSession) {
    return <div className="auth-shell">Loading session...</div>;
  }

  if (!session) {
    return <SignInScreen />;
  }

  if (sessionError) {
    return <div className="auth-shell auth-error">{sessionError}</div>;
  }

  if (!appSession) {
    return <div className="auth-shell">Preparing your profile...</div>;
  }

  return <AuthedApp appSession={appSession} />;
}

export default App;
