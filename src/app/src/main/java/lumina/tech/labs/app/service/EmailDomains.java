package lumina.tech.labs.app.service;

import java.util.Locale;
import java.util.Set;

public final class EmailDomains {

    private static final Set<String> PERSONAL = Set.of(
            "gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.br", "outlook.com", "outlook.com.br",
            "live.com", "msn.com", "yahoo.com", "yahoo.com.br", "ymail.com", "icloud.com", "me.com", "mac.com",
            "aol.com", "protonmail.com", "proton.me", "bol.com.br", "uol.com.br", "terra.com.br", "ig.com.br",
            "zoho.com", "gmx.com", "mail.com", "yandex.com"
    );

    private EmailDomains() {
    }

    public static boolean isPersonal(String domain) {
        return domain != null && PERSONAL.contains(domain.trim().toLowerCase(Locale.ROOT));
    }
}
