export default function PracticePage() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">智能题库</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex gap-3 mb-6">
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option>全部题型</option>
            <option>单项选择</option>
            <option>完形填空</option>
            <option>阅读理解</option>
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option>全部难度</option>
            <option>简单</option>
            <option>中等</option>
            <option>困难</option>
          </select>
        </div>
        <div className="text-center text-gray-400 py-12">
          选择题型和难度后开始练习
        </div>
      </div>
    </div>
  );
}
