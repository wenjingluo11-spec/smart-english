import { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../../lib/api";

interface AnalysisResult {
  vocabulary: { word: string; pos: string; meaning: string }[];
  grammar_points: { point: string; explanation: string }[];
  cultural_notes: string[];
  exercises: {
    type: string;
    question: string;
    options?: string[];
    answer: string;
  }[];
}

export default function ScreenshotScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("提示", "需要相机权限才能拍照");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setResult(null);
      setSelectedAnswers({});
      setRevealedAnswers({});
    }
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("提示", "需要相册权限才能选择图片");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setResult(null);
      setSelectedAnswers({});
      setRevealedAnswers({});
    }
  }

  async function handleAnalyze() {
    if (!imageUri) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const data = await api.upload<AnalysisResult>("/screenshot/analyze", imageUri);
      setResult(data);
    } catch (e: any) {
      Alert.alert("分析失败", e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function selectAnswer(exerciseIdx: number, option: string) {
    if (revealedAnswers[exerciseIdx]) return;
    setSelectedAnswers((prev) => ({ ...prev, [exerciseIdx]: option }));
  }

  function checkAnswer(exerciseIdx: number) {
    setRevealedAnswers((prev) => ({ ...prev, [exerciseIdx]: true }));
  }

  function resetAll() {
    setImageUri(null);
    setResult(null);
    setSelectedAnswers({});
    setRevealedAnswers({});
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>截图识题</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Pick buttons */}
      <View style={styles.pickRow}>
        <TouchableOpacity style={styles.pickBtn} onPress={pickFromCamera}>
          <Feather name="camera" size={22} color="#4A90D9" />
          <Text style={styles.pickBtnText}>拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickBtn} onPress={pickFromGallery}>
          <Feather name="image" size={22} color="#4A90D9" />
          <Text style={styles.pickBtnText}>从相册选择</Text>
        </TouchableOpacity>
      </View>

      {/* Image preview */}
      {imageUri && (
        <View style={styles.previewCard}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetAll}>
              <Feather name="x" size={16} color="#666" />
              <Text style={styles.resetBtnText}>重新选择</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.analyzeBtn, analyzing && { opacity: 0.6 }]}
              onPress={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="zap" size={16} color="#fff" />
                  <Text style={styles.analyzeBtnText}>开始分析</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading */}
      {analyzing && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>正在识别和分析图片内容...</Text>
        </View>
      )}

      {/* Results */}
      {result && (
        <View style={styles.resultsContainer}>
          {/* Vocabulary */}
          {result.vocabulary.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="book-open" size={18} color="#4A90D9" />
                <Text style={styles.sectionTitle}>词汇</Text>
              </View>
              {result.vocabulary.map((v, i) => (
                <View key={i} style={styles.vocabCard}>
                  <View style={styles.vocabTop}>
                    <Text style={styles.vocabWord}>{v.word}</Text>
                    <View style={styles.posBadge}>
                      <Text style={styles.posBadgeText}>{v.pos}</Text>
                    </View>
                  </View>
                  <Text style={styles.vocabMeaning}>{v.meaning}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Grammar points */}
          {result.grammar_points.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="edit-3" size={18} color="#4A90D9" />
                <Text style={styles.sectionTitle}>语法点</Text>
              </View>
              {result.grammar_points.map((g, i) => (
                <View key={i} style={styles.grammarCard}>
                  <Text style={styles.grammarPoint}>{g.point}</Text>
                  <Text style={styles.grammarExplanation}>{g.explanation}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Cultural notes */}
          {result.cultural_notes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="globe" size={18} color="#4A90D9" />
                <Text style={styles.sectionTitle}>文化笔记</Text>
              </View>
              {result.cultural_notes.map((note, i) => (
                <View key={i} style={styles.noteCard}>
                  <Feather name="info" size={14} color="#4A90D9" style={{ marginTop: 2 }} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Exercises */}
          {result.exercises.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="check-circle" size={18} color="#4A90D9" />
                <Text style={styles.sectionTitle}>练习</Text>
              </View>
              {result.exercises.map((ex, i) => {
                const selected = selectedAnswers[i];
                const revealed = revealedAnswers[i];
                const isCorrect = revealed && selected === ex.answer;
                const isWrong = revealed && selected !== ex.answer;

                return (
                  <View key={i} style={styles.exerciseCard}>
                    <View style={styles.exerciseMeta}>
                      <View style={styles.exerciseTypeBadge}>
                        <Text style={styles.exerciseTypeText}>{ex.type}</Text>
                      </View>
                      <Text style={styles.exerciseIdx}>{i + 1}/{result.exercises.length}</Text>
                    </View>
                    <Text style={styles.exerciseQuestion}>{ex.question}</Text>

                    {ex.options && ex.options.length > 0 && (
                      <View style={styles.optionsContainer}>
                        {ex.options.map((opt, j) => {
                          const isSelected = selected === opt;
                          const isAnswer = revealed && opt === ex.answer;
                          let optStyle = styles.optionBtn;
                          let textStyle = styles.optionText;

                          if (revealed && isAnswer) {
                            optStyle = { ...styles.optionBtn, ...styles.optionCorrect };
                            textStyle = { ...styles.optionText, ...styles.optionCorrectText };
                          } else if (revealed && isSelected && !isAnswer) {
                            optStyle = { ...styles.optionBtn, ...styles.optionWrong };
                            textStyle = { ...styles.optionText, ...styles.optionWrongText };
                          } else if (isSelected) {
                            optStyle = { ...styles.optionBtn, ...styles.optionActive };
                            textStyle = { ...styles.optionText, ...styles.optionActiveText };
                          }

                          return (
                            <TouchableOpacity
                              key={j}
                              style={optStyle}
                              onPress={() => selectAnswer(i, opt)}
                              disabled={revealed}
                            >
                              <Text style={textStyle}>{opt}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {!revealed && selected && (
                      <TouchableOpacity style={styles.checkBtn} onPress={() => checkAnswer(i)}>
                        <Text style={styles.checkBtnText}>检查答案</Text>
                      </TouchableOpacity>
                    )}

                    {revealed && (
                      <View
                        style={[
                          styles.answerFeedback,
                          isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
                        ]}
                      >
                        <View style={styles.feedbackHeader}>
                          <Feather
                            name={isCorrect ? "check-circle" : "x-circle"}
                            size={18}
                            color={isCorrect ? "#16A34A" : "#DC2626"}
                          />
                          <Text
                            style={[
                              styles.feedbackTitle,
                              { color: isCorrect ? "#16A34A" : "#DC2626" },
                            ]}
                          >
                            {isCorrect ? "回答正确!" : "回答错误"}
                          </Text>
                        </View>
                        {isWrong && (
                          <Text style={styles.feedbackAnswer}>正确答案: {ex.answer}</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 20, paddingBottom: 40 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#333" },

  /* Pick buttons */
  pickRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  pickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pickBtnText: { fontSize: 15, fontWeight: "600", color: "#4A90D9" },

  /* Preview */
  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#F5F7FA",
    marginBottom: 12,
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resetBtnText: { fontSize: 14, color: "#666" },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  analyzeBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  /* Loading */
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: { fontSize: 14, color: "#666" },

  /* Results */
  resultsContainer: { gap: 20 },

  /* Section */
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#333" },

  /* Vocabulary */
  vocabCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  vocabTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  vocabWord: { fontSize: 16, fontWeight: "600", color: "#333" },
  posBadge: {
    backgroundColor: "#EBF3FC",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  posBadgeText: { fontSize: 12, color: "#4A90D9", fontWeight: "500" },
  vocabMeaning: { fontSize: 14, color: "#666", lineHeight: 20 },

  /* Grammar */
  grammarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  grammarPoint: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 6 },
  grammarExplanation: { fontSize: 14, color: "#666", lineHeight: 22 },

  /* Cultural notes */
  noteCard: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  noteText: { flex: 1, fontSize: 14, color: "#666", lineHeight: 22 },

  /* Exercises */
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  exerciseMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseTypeBadge: {
    backgroundColor: "#EBF3FC",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exerciseTypeText: { fontSize: 12, color: "#4A90D9", fontWeight: "500" },
  exerciseIdx: { fontSize: 12, color: "#666" },
  exerciseQuestion: { fontSize: 15, color: "#333", lineHeight: 24, marginBottom: 14 },

  /* Options */
  optionsContainer: { gap: 8, marginBottom: 12 },
  optionBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  optionText: { fontSize: 15, color: "#333" },
  optionActive: { borderColor: "#4A90D9", backgroundColor: "#EBF3FC" },
  optionActiveText: { color: "#4A90D9", fontWeight: "500" },
  optionCorrect: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  optionCorrectText: { color: "#16A34A", fontWeight: "500" },
  optionWrong: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  optionWrongText: { color: "#DC2626", fontWeight: "500" },

  /* Check button */
  checkBtn: {
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  checkBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  /* Answer feedback */
  answerFeedback: { marginTop: 12, padding: 14, borderRadius: 12 },
  feedbackCorrect: { backgroundColor: "#F0FDF4" },
  feedbackWrong: { backgroundColor: "#FEF2F2" },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  feedbackTitle: { fontSize: 16, fontWeight: "600" },
  feedbackAnswer: { fontSize: 14, color: "#333", marginTop: 6, lineHeight: 20 },
});
