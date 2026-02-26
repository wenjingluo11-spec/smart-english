import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../lib/api";
import { useUserStore } from "../stores/user";
import type { User } from "../lib/types";

const GRADE_MAP: Record<string, string[]> = {
  小学: ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"],
  初中: ["七年级", "八年级", "九年级"],
  高中: ["高一", "高二", "高三"],
};

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useUserStore((s) => s.setAuth);

  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [grade, setGrade] = useState("");
  const [loading, setLoading] = useState(false);

  const [pickerField, setPickerField] = useState<"level" | "grade" | null>(null);

  const pickerOptions =
    pickerField === "level"
      ? Object.keys(GRADE_MAP)
      : pickerField === "grade" && gradeLevel
        ? GRADE_MAP[gradeLevel]
        : [];

  async function handleSubmit() {
    if (!phone || !password) return Alert.alert("提示", "请填写手机号和密码");
    if (isRegister && (!gradeLevel || !grade))
      return Alert.alert("提示", "请选择学段和年级");

    setLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister
        ? { phone, password, grade_level: gradeLevel, grade }
        : { phone, password };
      const { access_token } = await api.post<{ access_token: string }>(
        endpoint,
        body
      );
      // Temporarily store token so api.get can use it
      const { setToken } = await import("../lib/auth");
      await setToken(access_token);
      const user = await api.get<User>("/auth/me");
      await setAuth(user, access_token);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("错误", e.message || "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Smart English</Text>
        <Text style={styles.subtitle}>
          {isRegister ? "创建账号" : "登录账号"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="手机号"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholderTextColor="#9CA3AF"
        />
        <TextInput
          style={styles.input}
          placeholder="密码"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#9CA3AF"
        />

        {isRegister && (
          <>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setPickerField("level")}
            >
              <Text style={gradeLevel ? styles.pickerText : styles.pickerPlaceholder}>
                {gradeLevel || "选择学段"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => {
                if (!gradeLevel) return Alert.alert("提示", "请先选择学段");
                setPickerField("grade");
              }}
            >
              <Text style={grade ? styles.pickerText : styles.pickerPlaceholder}>
                {grade || "选择年级"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "请稍候..." : isRegister ? "注册" : "登录"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setIsRegister(!isRegister);
            setGradeLevel("");
            setGrade("");
          }}
        >
          <Text style={styles.switchText}>
            {isRegister ? "已有账号？去登录" : "没有账号？去注册"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={pickerField !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerField(null)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={pickerOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    if (pickerField === "level") {
                      setGradeLevel(item);
                      setGrade("");
                    } else {
                      setGrade(item);
                    }
                    setPickerField(null);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#3B82F6", textAlign: "center" },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: "#1F2937",
  },
  picker: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  pickerText: { fontSize: 16, color: "#1F2937" },
  pickerPlaceholder: { fontSize: 16, color: "#9CA3AF" },
  button: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchText: {
    color: "#3B82F6",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 300,
    paddingBottom: 32,
  },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalItemText: { fontSize: 16, color: "#1F2937", textAlign: "center" },
});
