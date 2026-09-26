package lumina.tech.labs.app.enums;

/**
 * Result of the ScoringEngine (FR03.2) applied to a Lead.
 * HIGH_PRIORITY leads are routed immediately to Inside Sales/SDRs.
 */
public enum Priority {
    LOW_PRIORITY,
    HIGH_PRIORITY,
    MEDIUM_PRIORITY
}