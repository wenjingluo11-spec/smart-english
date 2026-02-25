export default function Dashboard() {
  const quickLinks = [
    { title: "AI 导师", desc: "和 AI 老师对话学英语", href: "/tutor", icon: "🤖" },
    { title: "智能题库", desc: "按知识点刷题练习", href: "/practice", icon: "📝" },
    { title: "写作批改", desc: "提交作文获取 AI 批改", href: "/writing", icon: "✍️" },
    { title: "阅读训练", desc: "分级阅读材料", href: "/reading", icon: "📖" },
  ];

  return (
    <div className="max-w-4xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">学习主页</h2>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {quickLinks.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <h3 className="font-medium text-gray-800">{item.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-medium text-gray-800 mb-3">学习概览</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-xs text-gray-500 mt-1">今日练习</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-xs text-gray-500 mt-1">连续学习天数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">A1</div>
            <div className="text-xs text-gray-500 mt-1">当前等级</div>
          </div>
        </div>
      </div>
    </div>
  );
}
