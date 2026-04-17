import { VideoAnalysisReportNative } from '../../src/components/video-analysis/VideoAnalysisReportNative'

export default function AthleteScanReportScreen() {
  return <VideoAnalysisReportNative expectedRole="athlete" scanRoute="/athlete-scan" />
}
