defmodule RetWeb.ConfirmSigninController do
  use RetWeb, :controller

  alias Ret.{Account, Crypto, LoginToken}

  def index(conn, params) do
    conn
    |> put_resp_header("content-type", "text/html; charset=utf-8")
    |> send_resp(200, render_page(:review, params))
  end

  def accept(conn, params) do
    case verify_and_broadcast(params) do
      {:ok, _email} ->
        conn
        |> put_resp_header("content-type", "text/html; charset=utf-8")
        |> send_resp(200, render_page(:accepted, %{}))

      {:error, _reason} ->
        conn
        |> put_resp_header("content-type", "text/html; charset=utf-8")
        |> send_resp(400, render_page(:invalid, %{}))
    end
  end

  def deny(conn, params) do
    _ = maybe_expire(params)

    conn
    |> put_resp_header("content-type", "text/html; charset=utf-8")
    |> send_resp(200, render_page(:denied, %{}))
  end

  defp verify_and_broadcast(%{"auth_topic" => auth_topic, "auth_token" => token, "auth_payload" => payload})
       when is_binary(auth_topic) and is_binary(token) and is_binary(payload) do
    case LoginToken.lookup_by_token(token) do
      %LoginToken{identifier_hash: identifier_hash, payload_key: payload_key} ->
        decrypted_payload =
          payload |> :base64.decode() |> Crypto.decrypt(payload_key) |> Poison.decode!()

        credentials =
          identifier_hash
          |> Account.account_for_login_identifier_hash(true, decrypted_payload["email"])
          |> Account.credentials_for_account()

        RetWeb.Endpoint.broadcast!(auth_topic, "auth_credentials", %{credentials: credentials, payload: decrypted_payload})

        LoginToken.expire(token)

        {:ok, decrypted_payload["email"]}

      _ ->
        {:error, :invalid}
    end
  end

  defp verify_and_broadcast(_), do: {:error, :missing}

  defp maybe_expire(%{"auth_token" => token}) when is_binary(token) do
    LoginToken.expire(token)
  end

  defp maybe_expire(_), do: :ok

  defp render_page(:review, params) do
    auth_topic = Map.get(params, "auth_topic", "")
    auth_token = Map.get(params, "auth_token", "")
    auth_payload = Map.get(params, "auth_payload", "")

    """
    <!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>Confirm Sign-In</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #0b1220; color: #e5e7eb; margin: 0; }
          .wrap { max-width: 560px; margin: 48px auto; padding: 24px; background: #111827; border: 1px solid #1f2937; border-radius: 12px; }
          h1 { margin: 0 0 12px; font-size: 20px; }
          p { margin: 0 0 18px; line-height: 1.5; color: #cbd5e1; }
          .btns { display: flex; gap: 12px; margin-top: 18px; }
          button { appearance: none; border: 0; padding: 10px 14px; border-radius: 10px; font-weight: 600; cursor: pointer; }
          .accept { background: #22c55e; color: #052e16; }
          .deny { background: #ef4444; color: #450a0a; }
          .muted { font-size: 12px; color: #94a3b8; margin-top: 14px; }
        </style>
      </head>
      <body>
        <div class=\"wrap\">
          <h1>Confirm Sign-In</h1>
          <p>Someone is trying to sign in to your account. If this was you, click <b>Accept</b>. Otherwise click <b>Deny</b>.</p>

          <div class=\"btns\">
            <form method=\"post\" action=\"/confirm-signin/accept\">
              <input type=\"hidden\" name=\"auth_topic\" value=\"#{html_escape(auth_topic)}\" />
              <input type=\"hidden\" name=\"auth_token\" value=\"#{html_escape(auth_token)}\" />
              <input type=\"hidden\" name=\"auth_payload\" value=\"#{html_escape(auth_payload)}\" />
              <button class=\"accept\" type=\"submit\">Accept</button>
            </form>

            <form method=\"post\" action=\"/confirm-signin/deny\">
              <input type=\"hidden\" name=\"auth_token\" value=\"#{html_escape(auth_token)}\" />
              <button class=\"deny\" type=\"submit\">Deny</button>
            </form>
          </div>

          <div class=\"muted\">You can close this page after you choose an option.</div>
        </div>
      </body>
    </html>
    """
  end

  defp render_page(:accepted, _params) do
    """
    <!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>Sign-In Confirmed</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #0b1220; color: #e5e7eb; margin: 0; }
          .wrap { max-width: 560px; margin: 48px auto; padding: 24px; background: #111827; border: 1px solid #1f2937; border-radius: 12px; }
          h1 { margin: 0 0 12px; font-size: 20px; }
          p { margin: 0; line-height: 1.5; color: #cbd5e1; }
        </style>
      </head>
      <body>
        <div class=\"wrap\">
          <h1>Success</h1>
          <p>Your sign-in request has been accepted. You should now be signed in on the original page.</p>
        </div>
      </body>
    </html>
    """
  end

  defp render_page(:denied, _params) do
    """
    <!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>Sign-In Denied</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #0b1220; color: #e5e7eb; margin: 0; }
          .wrap { max-width: 560px; margin: 48px auto; padding: 24px; background: #111827; border: 1px solid #1f2937; border-radius: 12px; }
          h1 { margin: 0 0 12px; font-size: 20px; }
          p { margin: 0; line-height: 1.5; color: #cbd5e1; }
        </style>
      </head>
      <body>
        <div class=\"wrap\">
          <h1>Denied</h1>
          <p>This sign-in request has been denied.</p>
        </div>
      </body>
    </html>
    """
  end

  defp render_page(:invalid, _params) do
    """
    <!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>Invalid Request</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #0b1220; color: #e5e7eb; margin: 0; }
          .wrap { max-width: 560px; margin: 48px auto; padding: 24px; background: #111827; border: 1px solid #1f2937; border-radius: 12px; }
          h1 { margin: 0 0 12px; font-size: 20px; }
          p { margin: 0; line-height: 1.5; color: #cbd5e1; }
        </style>
      </head>
      <body>
        <div class=\"wrap\">
          <h1>Invalid or expired request</h1>
          <p>This sign-in request is invalid or has expired. Please try signing in again.</p>
        </div>
      </body>
    </html>
    """
  end

  defp html_escape(nil), do: ""

  defp html_escape(value) when is_binary(value) do
    value
    |> String.replace("&", "&amp;")
    |> String.replace("\"", "&quot;")
    |> String.replace("'", "&#39;")
    |> String.replace("<", "&lt;")
    |> String.replace(">", "&gt;")
  end
end
