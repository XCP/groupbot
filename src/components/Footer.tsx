import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
            <Link 
              href="/faq" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              FAQ
            </Link>
            <Link 
              href="/policy" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Policy Generator
            </Link>
            <a 
              href="https://github.com/XCP/groupbot" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* Project Credit */}
          <div className="text-center md:text-right">
            <a 
              href="https://21e14.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              This is a 21e14 project. <span className="text-red-500">❤️</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}