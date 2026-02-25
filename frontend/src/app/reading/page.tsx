export default function ReadingPage() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">阅读训练</h2>
      <div className="space-y-3">
        {[
          { title: "The Solar System", level: "A2", words: 320 },
          { title: "A Day at School", level: "A1", words: 180 },
          { title: "Climate Change", level: "B1", words: 450 },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-800">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{item.words} words</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                {item.level}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
