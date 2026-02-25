export default function VocabularyPage() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">词汇系统</h2>
      <div className="flex gap-3 mb-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
          添加生词
        </button>
        <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          开始复习
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">
        生词本为空，在学习过程中遇到的生词会自动添加到这里
      </div>
    </div>
  );
}
