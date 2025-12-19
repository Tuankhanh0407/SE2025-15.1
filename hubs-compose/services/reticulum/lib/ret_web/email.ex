defmodule RetWeb.Email do
  use Bamboo.Phoenix, view: RetWeb.EmailView
  alias Ret.{AppConfig}

  def auth_email(to_address, signin_args) do
    app_name =
      AppConfig.get_cached_config_value("translations|en|app-name") || RetWeb.Endpoint.host()

    app_full_name = AppConfig.get_cached_config_value("translations|en|app-full-name") || app_name
    admin_email = Application.get_env(:ret, Ret.Account)[:admin_email]
    custom_login_subject = AppConfig.get_cached_config_value("auth|login_subject")
    custom_login_body = AppConfig.get_cached_config_value("auth|login_body")

    email_subject =
      if string_is_nil_or_empty(custom_login_subject),
        do: "Your #{app_name} Sign-In Link",
        else: custom_login_subject

    confirm_link = "#{RetWeb.Endpoint.url()}/confirm-signin?#{URI.encode_query(signin_args)}"

    email_body =
      if string_is_nil_or_empty(custom_login_body),
        do:
          "To sign-in to #{app_name}, please review this sign-in request in your inbox. If you did not make this request, please ignore this e-mail.",
        else: add_magic_link_to_custom_login_body(custom_login_body, confirm_link)

    email_html_body =
      """
      <p>To sign-in to #{app_name}, please review the sign-in request in your inbox.</p>
      <p>If you did not make this request, you can ignore this email.</p>
      <!-- #{confirm_link} -->
      """

    email =
      new_email()
      |> to(to_address)
      |> from({app_full_name, from_address()})
      |> subject(email_subject)
      |> text_body(email_body)
      |> html_body(email_html_body)

    if admin_email && !System.get_env("TURKEY_MODE") do
      email |> put_header("Return-Path", admin_email)
    else
      email
    end
  end

  defp string_is_nil_or_empty(check_string) do
    check_string == nil || String.length(String.trim(check_string)) == 0
  end

  defp add_magic_link_to_custom_login_body(custom_message, confirm_link) do
    if Regex.match?(~r/{{ link }}/, custom_message) do
      Regex.replace(~r/{{ link }}/, custom_message, confirm_link)
    else
      custom_message <> "\n\n" <> confirm_link
    end
  end

  def enabled? do
    !!Application.get_env(:ret, Ret.Mailer)[:adapter]
  end

  defp from_address do
    Application.get_env(:ret, __MODULE__)[:from]
  end
end
