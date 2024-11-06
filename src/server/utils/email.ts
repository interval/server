import env from "env";

export const isEmailEnabled = () => !!env.POSTMARK_API_KEY && !!env.EMAIL_FROM
