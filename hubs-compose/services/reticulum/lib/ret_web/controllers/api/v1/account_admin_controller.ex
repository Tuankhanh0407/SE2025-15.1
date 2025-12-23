defmodule RetWeb.Api.V1.AccountAdminController do
  use RetWeb, :controller

  import Ecto.Query

  alias Ret.{Account, Repo}

  def disable(conn, %{"id" => id}) do
    with {:ok, account} <- fetch_account(id),
         :ok <- ensure_not_self(conn, account),
         :ok <- ensure_not_last_admin(account) do
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      account
      |> Ecto.Changeset.change(state: :disabled, min_token_issued_at: now)
      |> Repo.update()
      |> case do
        {:ok, updated} -> json(conn, account_payload(updated))
        {:error, _} -> conn |> put_status(:internal_server_error) |> json(%{error: "update_failed"})
      end
    else
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "not_found"})
      {:error, :self_action_forbidden} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "cannot_disable_self"})
      {:error, :last_admin} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "cannot_disable_last_admin"})
      _ -> conn |> put_status(:unprocessable_entity) |> json(%{error: "invalid_request"})
    end
  end

  def enable(conn, %{"id" => id}) do
    with {:ok, account} <- fetch_account(id) do
      account
      |> Ecto.Changeset.change(state: :enabled)
      |> Repo.update()
      |> case do
        {:ok, updated} -> json(conn, account_payload(updated))
        {:error, _} -> conn |> put_status(:internal_server_error) |> json(%{error: "update_failed"})
      end
    else
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "not_found"})
      _ -> conn |> put_status(:unprocessable_entity) |> json(%{error: "invalid_request"})
    end
  end

  def promote_admin(conn, %{"id" => id}) do
    with {:ok, account} <- fetch_account(id) do
      account
      |> Ecto.Changeset.change(is_admin: true)
      |> Repo.update()
      |> case do
        {:ok, updated} -> json(conn, account_payload(updated))
        {:error, _} -> conn |> put_status(:internal_server_error) |> json(%{error: "update_failed"})
      end
    else
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "not_found"})
      _ -> conn |> put_status(:unprocessable_entity) |> json(%{error: "invalid_request"})
    end
  end

  def demote_admin(conn, %{"id" => id}) do
    with {:ok, account} <- fetch_account(id),
         :ok <- ensure_not_self(conn, account),
         :ok <- ensure_not_last_admin(account) do
      account
      |> Ecto.Changeset.change(is_admin: false)
      |> Repo.update()
      |> case do
        {:ok, updated} -> json(conn, account_payload(updated))
        {:error, _} -> conn |> put_status(:internal_server_error) |> json(%{error: "update_failed"})
      end
    else
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "not_found"})
      {:error, :self_action_forbidden} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "cannot_demote_self"})
      {:error, :last_admin} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "cannot_demote_last_admin"})
      _ -> conn |> put_status(:unprocessable_entity) |> json(%{error: "invalid_request"})
    end
  end

  def revoke_sessions(conn, %{"id" => id}) do
    with {:ok, account} <- fetch_account(id) do
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      account
      |> Ecto.Changeset.change(min_token_issued_at: now)
      |> Repo.update()
      |> case do
        {:ok, updated} -> json(conn, account_payload(updated))
        {:error, _} -> conn |> put_status(:internal_server_error) |> json(%{error: "update_failed"})
      end
    else
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "not_found"})
      _ -> conn |> put_status(:unprocessable_entity) |> json(%{error: "invalid_request"})
    end
  end

  defp fetch_account(id) do
    case Integer.parse(to_string(id)) do
      {account_id, ""} ->
        case Repo.get(Account, account_id) do
          %Account{} = account -> {:ok, account}
          _ -> {:error, :not_found}
        end

      _ ->
        {:error, :not_found}
    end
  end

  defp ensure_not_self(conn, %Account{account_id: target_id}) do
    current = Guardian.Plug.current_resource(conn)

    if current && current.account_id == target_id do
      {:error, :self_action_forbidden}
    else
      :ok
    end
  end

  defp ensure_not_last_admin(%Account{is_admin: true, account_id: account_id}) do
    other_admins_count =
      Repo.aggregate(from(a in Account, where: a.is_admin and a.account_id != ^account_id), :count, :account_id)

    if other_admins_count == 0 do
      {:error, :last_admin}
    else
      :ok
    end
  end

  defp ensure_not_last_admin(_account), do: :ok

  defp account_payload(%Account{} = account) do
    %{
      id: "#{account.account_id}",
      is_admin: !!account.is_admin,
      state: account.state,
      min_token_issued_at: account.min_token_issued_at
    }
  end
end
