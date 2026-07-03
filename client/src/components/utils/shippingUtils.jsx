/**
 * Utility functions for shipping service mapping
 */

/**
 * Normalize shipping service name to base type
 * Maps various shipping service variants to their base types
 * 
 * Examples:
 * - SAP-COD (ZANEVA) -> sap
 * - SAP-CASH (MUSWIM) -> sap
 * - JNT-COD -> jnt
 * - J&T Express -> jnt
 */
export function normalizeShippingService(serviceName) {
  if (!serviceName) return '';
  
  const normalized = serviceName.toLowerCase().trim();
  
  // SAP variants
  if (normalized.includes('sap')) {
    return 'sap';
  }
  
  // J&T / JNT variants
  if (normalized.includes('jnt') || normalized.includes('j&t')) {
    return 'jnt';
  }
  
  // JNE variants
  if (normalized.includes('jne')) {
    return 'jne';
  }
  
  // SiCepat variants
  if (normalized.includes('sicepat')) {
    return 'sicepat';
  }
  
  // AnterAja variants
  if (normalized.includes('anteraja')) {
    return 'anteraja';
  }
  
  // Ninja Xpress variants
  if (normalized.includes('ninja')) {
    return 'ninja';
  }
  
  // ID Express variants
  if (normalized.includes('id express') || normalized.includes('idexpress')) {
    return 'idexpress';
  }
  
  // Lion Parcel variants
  if (normalized.includes('lion')) {
    return 'lion';
  }
  
  // Wahana variants
  if (normalized.includes('wahana')) {
    return 'wahana';
  }
  
  // TIKI variants
  if (normalized.includes('tiki')) {
    return 'tiki';
  }
  
  // POS Indonesia variants
  if (normalized.includes('pos') && normalized.includes('indonesia')) {
    return 'pos';
  }
  
  // Shopee Express variants
  if (normalized.includes('shopee')) {
    return 'shopee';
  }
  
  // Grab Express variants
  if (normalized.includes('grab')) {
    return 'grab';
  }
  
  // Gojek / GoSend variants
  if (normalized.includes('gojek') || normalized.includes('gosend')) {
    return 'gojek';
  }
  
  // Return original if no match
  return normalized;
}

/**
 * Check if shipping service is SAP
 */
export function isSAPService(serviceName) {
  return normalizeShippingService(serviceName) === 'sap';
}

/**
 * Check if shipping service is J&T
 */
export function isJNTService(serviceName) {
  return normalizeShippingService(serviceName) === 'jnt';
}

/**
 * Get display name for normalized service
 */
export function getServiceDisplayName(normalizedService) {
  const displayNames = {
    'sap': 'SAP',
    'jnt': 'J&T',
    'jne': 'JNE',
    'sicepat': 'SiCepat',
    'anteraja': 'AnterAja',
    'ninja': 'Ninja Xpress',
    'idexpress': 'ID Express',
    'lion': 'Lion Parcel',
    'wahana': 'Wahana',
    'tiki': 'TIKI',
    'pos': 'POS Indonesia',
    'shopee': 'Shopee Express',
    'grab': 'Grab Express',
    'gojek': 'Gojek',
  };
  
  return displayNames[normalizedService] || normalizedService.toUpperCase();
}