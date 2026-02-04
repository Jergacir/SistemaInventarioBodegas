/**
 * Transaction Code Generator
 * Generates unique codes for movements: SAL-XXXXXX, TRF-XXXXXX, ENT-XXXXXX
 * Each type has its own independent sequence
 */

export const CodeGenerator = {
    /**
     * Generate a transaction code based on type
     * Counts only existing codes with the same prefix to ensure independent sequences
     * @param {string} type - Transaction type
     * @param {Array} movements - List of existing movements to check against
     */
    generate(type, movements = []) {
        const prefixes = {
            'SALIDA': 'SAL',
            'TRANSFERENCIA': 'TRF',
            'ENTRADA': 'ENT'
        };

        const prefix = prefixes[type];
        if (!prefix) return 'XXX-000000';

        // Count only existing codes with this prefix to get next sequence number
        const codesWithPrefix = movements.filter(m => m.codigo_movimiento && m.codigo_movimiento.startsWith(prefix + '-'));

        // Extract numeric sequences from existing codes
        const existingSequences = codesWithPrefix
            .map(m => {
                const match = m.codigo_movimiento.match(/\d+$/);
                return match ? parseInt(match[0]) : 0;
            })
            .filter(num => num > 0); // Only valid numbers

        // Find max sequence, or start at 0 if none exist
        const maxSequence = existingSequences.length > 0 ? Math.max(...existingSequences) : 0;
        const nextSequence = maxSequence + 1;

        return `${prefix}-${String(nextSequence).padStart(6, '0')}`;
    },

    /**
     * Get the next sequence number without incrementing
     * @param {string} type - 'SALIDA', 'TRANSFERENCIA', or 'ENTRADA'
     * @param {Array} movements - List of existing movements
     * @returns {string} - Preview of next code
     */
    preview(type, movements = []) {
        // Simply return what generate() would create
        return this.generate(type, movements);
    }
};
