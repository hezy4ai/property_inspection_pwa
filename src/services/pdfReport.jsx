import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Image,
  pdf
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#1e293b'
  },
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#0284c7',
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandLogoBox: {
    width: 26,
    height: 26,
    backgroundColor: '#0284c7',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandLogoText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold'
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 8,
    color: '#64748b'
  },
  reportBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'flex-end'
  },
  reportBadgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0284c7'
  },
  reportDateText: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  metadataGrid: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  metaItem: {
    width: '50%',
    marginBottom: 6
  },
  metaLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  metaValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center'
  },
  summaryNumber: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  summaryLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 2
  },
  defectCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10
  },
  defectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 4
  },
  defectIndexAndArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  defectIndexBadge: {
    backgroundColor: '#0f172a',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2
  },
  defectIndexText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff'
  },
  defectAreaText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b'
  },
  severityBadgeCritical: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  severityTextCritical: {
    color: '#dc2626',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold'
  },
  severityBadgeModerate: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  severityTextModerate: {
    color: '#d97706',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold'
  },
  severityBadgeMinor: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  severityTextMinor: {
    color: '#0284c7',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold'
  },
  defectDescription: {
    fontSize: 8.5,
    lineHeight: 1.4,
    color: '#334155',
    marginBottom: 6
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4
  },
  photoLink: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    textDecoration: 'none'
  },
  photoLinkText: {
    fontSize: 7.5,
    color: '#0284c7',
    fontFamily: 'Helvetica-Bold'
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerLeft: {
    fontSize: 7,
    color: '#94a3b8'
  },
  footerPageNumber: {
    fontSize: 7,
    color: '#94a3b8',
    fontFamily: 'Helvetica-Bold'
  }
});

function SeverityBadge({ severity }) {
  const sev = (severity || 'MODERATE').toUpperCase();
  if (sev === 'CRITICAL') {
    return (
      <View style={styles.severityBadgeCritical}>
        <Text style={styles.severityTextCritical}>CRITICAL</Text>
      </View>
    );
  }
  if (sev === 'MINOR') {
    return (
      <View style={styles.severityBadgeMinor}>
        <Text style={styles.severityTextMinor}>MINOR</Text>
      </View>
    );
  }
  return (
    <View style={styles.severityBadgeModerate}>
      <Text style={styles.severityTextModerate}>MODERATE</Text>
    </View>
  );
}

export function InspectionReportDocument({ data = {} }) {
  const {
    id = '',
    estate_name = 'Property Inspection',
    unit_number = 'N/A',
    inspector_name = 'Field Inspector',
    inspection_date = new Date().toISOString().split('T')[0],
    status = 'COMPLETED',
    deficiencies = []
  } = data;

  const totalDefects = deficiencies.length;
  const criticalCount = deficiencies.filter(d => (d.severity || '').toUpperCase() === 'CRITICAL').length;
  const moderateCount = deficiencies.filter(d => (d.severity || '').toUpperCase() === 'MODERATE').length;
  const minorCount = deficiencies.filter(d => (d.severity || '').toUpperCase() === 'MINOR').length;

  return (
    <Document title={`Inspection Report - ${estate_name} ${unit_number}`}>
      <Page size="A4" style={styles.page} wrap>
        {/* Header Bar */}
        <View style={styles.headerContainer} fixed>
          <View style={styles.headerBrand}>
            <View style={styles.brandLogoBox}>
              <Text style={styles.brandLogoText}>P</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>InspectPWA</Text>
              <Text style={styles.headerSubtitle}>Official Property Inspection & Punch-List Report</Text>
            </View>
          </View>
          <View style={styles.reportBadge}>
            <Text style={styles.reportBadgeText}>{status}</Text>
            <Text style={styles.reportDateText}>Date: {inspection_date}</Text>
          </View>
        </View>

        {/* Property Metadata Section */}
        <Text style={styles.sectionTitle}>Property & Inspection Overview</Text>
        <View style={styles.metadataGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Estate / Project Name</Text>
            <Text style={styles.metaValue}>{estate_name}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Unit / Door Number</Text>
            <Text style={styles.metaValue}>{unit_number}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Inspector Name</Text>
            <Text style={styles.metaValue}>{inspector_name}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Inspection ID</Text>
            <Text style={[styles.metaValue, { fontSize: 7, fontFamily: 'Courier' }]}>{id}</Text>
          </View>
        </View>

        {/* Executive Summary Metrics */}
        <Text style={styles.sectionTitle}>Executive Deficiency Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{totalDefects}</Text>
            <Text style={styles.summaryLabel}>Total Defects</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.summaryNumber, { color: '#dc2626' }]}>{criticalCount}</Text>
            <Text style={styles.summaryLabel}>Critical</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: '#fde68a', backgroundColor: '#fffbeb' }]}>
            <Text style={[styles.summaryNumber, { color: '#d97706' }]}>{moderateCount}</Text>
            <Text style={styles.summaryLabel}>Moderate</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }]}>
            <Text style={[styles.summaryNumber, { color: '#0284c7' }]}>{minorCount}</Text>
            <Text style={styles.summaryLabel}>Minor</Text>
          </View>
        </View>

        {/* Detailed Punch-List Items */}
        <Text style={styles.sectionTitle}>Detailed Punch-List Deficiencies</Text>
        {deficiencies.length === 0 ? (
          <View style={[styles.defectCard, { alignItems: 'center', padding: 16 }]}>
            <Text style={{ fontSize: 9, color: '#64748b' }}>No deficiencies logged for this property.</Text>
          </View>
        ) : (
          deficiencies.map((item, index) => {
            const photoList = item.photo_urls || [];
            return (
              <View key={item.id || index} wrap={false} style={styles.defectCard}>
                <View style={styles.defectHeader}>
                  <View style={styles.defectIndexAndArea}>
                    <View style={styles.defectIndexBadge}>
                      <Text style={styles.defectIndexText}>#{index + 1}</Text>
                    </View>
                    <Text style={styles.defectAreaText}>{item.area || 'General Area'}</Text>
                  </View>
                  <SeverityBadge severity={item.severity} />
                </View>

                <Text style={styles.defectDescription}>{item.description || 'No detailed observation provided.'}</Text>

                {photoList.length > 0 && (
                  <View style={styles.photosRow}>
                    {photoList.map((url, pIdx) => (
                      <Link key={pIdx} src={url} style={styles.photoLink}>
                        <Text style={styles.photoLinkText}>📷 View Photo #{pIdx + 1}</Text>
                      </Link>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Fixed Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>InspectPWA • Official Inspection Certificate</Text>
          <Text
            style={styles.footerPageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

/**
 * Generates an in-memory application/pdf Blob from inspection data.
 */
export async function generateInspectionPdfBlob(inspectionData) {
  const doc = <InspectionReportDocument data={inspectionData} />;
  const blob = await pdf(doc).toBlob();
  return blob;
}
