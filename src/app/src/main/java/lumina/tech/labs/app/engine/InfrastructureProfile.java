package lumina.tech.labs.app.engine;

import java.math.BigDecimal;

public enum InfrastructureProfile {
    CENTRAL_AC_MIXED_LIGHTING("0.32", "Ar-condicionado central + iluminação mista"),
    STANDARD_CORPORATE_BUILDING("0.24", "Prédio corporativo padrão (split inverter e iluminação mista)"),
    LOGISTICS_WAREHOUSE("0.30", "Galpão logístico / híbrido administrativo"),
    PARTIAL_RETROFIT("0.15", "Retrofit parcial já implementado");

    public static final String CODES = "CENTRAL_AC_MIXED_LIGHTING|STANDARD_CORPORATE_BUILDING|LOGISTICS_WAREHOUSE|PARTIAL_RETROFIT";

    private final BigDecimal baseReduction;
    private final String label;

    InfrastructureProfile(String baseReduction, String label) {
        this.baseReduction = new BigDecimal(baseReduction);
        this.label = label;
    }

    public static String labelOf(String code) {
        for (InfrastructureProfile p : values()) {
            if (p.name().equals(code)) {
                return p.label;
            }
        }
        return code;
    }

    public BigDecimal baseReduction() {
        return baseReduction;
    }
}
