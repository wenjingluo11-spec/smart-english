export default function ProfilePage() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">个人中心</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
            U
          </div>
          <div>
            <div className="font-medium text-gray-800">未登录</div>
            <div className="text-sm text-gray-500">初中 · 七年级 · CEFR A1</div>
          </div>
        </div>
        <hr className="border-gray-200" />
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">0</div>
            <div className="text-xs text-gray-500">总练习题数</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">0%</div>
            <div className="text-xs text-gray-500">正确率</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">0</div>
            <div className="text-xs text-gray-500">生词本</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">0</div>
            <div className="text-xs text-gray-500">写作提交</div>
          </div>
        </div>
      </div>
    </div>
  );
}
