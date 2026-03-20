package com.omnihub.core.util;

public class LogMaskUtil {

    private LogMaskUtil() {}

    public static String maskEmail(String email) {
        if (email == null) return "[null]";
        int at = email.indexOf('@');
        if (at <= 1) return "****";
        return email.charAt(0) + "****" + email.substring(at);
    }

    public static String maskPhone(String phone) {
        if (phone == null) return "[null]";
        if (phone.length() <= 4) return "****";
        return "****" + phone.substring(phone.length() - 4);
    }
}
