defmodule Ret.Repo.Migrations.AddEmailToAccounts do
  use Ecto.Migration

  def change do
    alter table("accounts") do
      add :email, :string
    end

    create unique_index("accounts", ["(lower(email))"],
             name: "accounts_email_lower_unique",
             where: "email is not null"
           )

    execute "select ret0_admin.create_or_replace_admin_view('accounts')"
  end
end
