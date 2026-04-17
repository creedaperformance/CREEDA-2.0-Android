import { Platform } from 'react-native'

import { VideoAnalysisAnalyzer as NativeVideoAnalysisAnalyzer } from './VideoAnalysisAnalyzer.native'
import { VideoAnalysisAnalyzer as WebVideoAnalysisAnalyzer } from './VideoAnalysisAnalyzer.web'

export const VideoAnalysisAnalyzer =
  Platform.OS === 'web' ? WebVideoAnalysisAnalyzer : NativeVideoAnalysisAnalyzer
