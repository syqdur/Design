import React, { useState } from 'react';
import { X, Star, Heart, Camera, Users, Shield, Download, Smartphone, Globe, Zap, Crown, Gift, MessageSquare, Video, Image, Lock, Unlock, Edit3, Trash2, Eye, TrendingUp, DollarSign, Target, Rocket, Award, CheckCircle } from 'lucide-react';

interface ShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const ShowcaseModal: React.FC<ShowcaseModalProps> = ({
  isOpen,
  onClose,
  isDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<'showcase' | 'features' | 'business'>('showcase');

  if (!isOpen) return null;

  const currentFeatures = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: "📸 Instagram-Style Galerie",
      description: "Moderne, mobile-first Benutzeroberfläche mit Likes, Kommentaren und Stories",
      highlight: "Wie Instagram, aber für eure Hochzeit!"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "👥 Smart User Management",
      description: "Jeder kann nur seine eigenen Beiträge bearbeiten/löschen. Sichere Benutzeridentifikation.",
      highlight: "Datenschutz & Sicherheit first!"
    },
    {
      icon: <Video className="w-6 h-6" />,
      title: "🎥 Video Recording",
      description: "Direkte Videoaufnahme mit Kamera-Wechsel (Front/Back) und Live-Preview",
      highlight: "Professionelle Video-Features!"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "💌 Editierbare Notizen",
      description: "Gäste können schöne Nachrichten hinterlassen und später bearbeiten",
      highlight: "Persönliche Hochzeitswünsche!"
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: "📦 Smart ZIP Download",
      description: "Alle Medien als organisierte ZIP mit Metadaten und Fehlerbehandlung",
      highlight: "Perfekt für Fotobücher!"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "🔒 Admin Controls",
      description: "Website live schalten/sperren, Medien verwalten, deutsche Fotobuch-Services",
      highlight: "Vollständige Kontrolle!"
    }
  ];

  const potentialFeatures = [
    {
      icon: <Star className="w-6 h-6" />,
      title: "⭐ Bewertungssystem",
      description: "Gäste können Fotos mit 1-5 Sternen bewerten für 'Best of' Sammlung",
      category: "Engagement"
    },
    {
      icon: <Gift className="w-6 h-6" />,
      title: "🎁 Geschenkeliste Integration",
      description: "Digitale Wunschliste mit Status-Updates und Dankesnachrichten",
      category: "E-Commerce"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "🌍 Live-Karte",
      description: "Interaktive Karte mit Foto-Pins von verschiedenen Hochzeitslocations",
      category: "Interaktiv"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "⚡ Live Stories",
      description: "24h verschwindende Stories wie Instagram für spontane Momente",
      category: "Social"
    },
    {
      icon: <Crown className="w-6 h-6" />,
      title: "👑 VIP Bereiche",
      description: "Exklusive Bereiche für Familie, Trauzeugen oder Fotografen",
      category: "Premium"
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "💕 Paar-Timeline",
      description: "Chronologische Liebesgeschichte mit Meilensteinen und Fotos",
      category: "Storytelling"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "📱 QR-Code Sharing",
      description: "Automatische QR-Codes für einfaches Teilen an Tischen",
      category: "Convenience"
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "👁️ Live View Counter",
      description: "Zeige wie viele Gäste gerade online sind und aktiv teilnehmen",
      category: "Engagement"
    }
  ];

  const businessModels = [
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "💰 Freemium Model",
      description: "Basis kostenlos, Premium Features kostenpflichtig",
      pricing: "0€ - 49€ pro Hochzeit",
      features: ["Unlimited Fotos (Free)", "Premium Themes (€9)", "Advanced Analytics (€19)", "White Label (€49)"],
      potential: "Hoch - Niedrige Einstiegshürde"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "🎯 B2B Lizenzierung",
      description: "Verkauf an Hochzeitsplaner, Fotografen, Locations",
      pricing: "99€ - 499€ pro Monat",
      features: ["Multi-Client Dashboard", "Branded Solutions", "API Access", "Support"],
      potential: "Sehr hoch - Recurring Revenue"
    },
    {
      icon: <Rocket className="w-6 h-6" />,
      title: "🚀 SaaS Platform",
      description: "Vollständige Hochzeitsplanungs-Suite",
      pricing: "19€ - 99€ pro Monat",
      features: ["Gästeliste", "Budgetplaner", "Vendor Management", "Timeline"],
      potential: "Mittel - Hohe Entwicklungskosten"
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "🏆 Marketplace Model",
      description: "Provision von Fotobuch-Services und Partnern",
      pricing: "5-15% Provision",
      features: ["Fotobuch Integration", "Vendor Partnerships", "Affiliate Marketing"],
      potential: "Hoch - Passive Income"
    }
  ];

  const implementationSteps = [
    {
      phase: "Phase 1: MVP Optimierung",
      duration: "2-4 Wochen",
      tasks: [
        "Performance Optimierung",
        "Mobile App (PWA)",
        "Erweiterte Admin Features",
        "A/B Testing Setup"
      ],
      investment: "500€ - 2.000€"
    },
    {
      phase: "Phase 2: Feature Expansion",
      duration: "1-3 Monate", 
      tasks: [
        "Bewertungssystem",
        "Live Stories",
        "QR-Code Integration",
        "Analytics Dashboard"
      ],
      investment: "2.000€ - 8.000€"
    },
    {
      phase: "Phase 3: Business Launch",
      duration: "2-4 Monate",
      tasks: [
        "Payment Integration",
        "Multi-Tenant Architecture",
        "Marketing Website",
        "Customer Support"
      ],
      investment: "5.000€ - 20.000€"
    },
    {
      phase: "Phase 4: Scale & Growth",
      duration: "6+ Monate",
      tasks: [
        "B2B Sales Team",
        "API Partnerships",
        "International Expansion",
        "Advanced Features"
      ],
      investment: "20.000€+"
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pink-300">
              <img 
                src="https://i.ibb.co/PvXjwss4/profil.jpg" 
                alt="Kristin & Maurizio"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className={`text-2xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                WeddingPix Showcase
              </h2>
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Die moderne Hochzeitsgalerie-Plattform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors duration-300 ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          {[
            { id: 'showcase', label: '🎯 Showcase', icon: <Star className="w-4 h-4" /> },
            { id: 'features', label: '⚡ Features', icon: <Zap className="w-4 h-4" /> },
            { id: 'business', label: '💰 Business', icon: <TrendingUp className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? isDarkMode
                    ? 'text-pink-400 border-b-2 border-pink-400 bg-gray-700/30'
                    : 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/20'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'showcase' && (
            <div className="space-y-8">
              {/* Hero Section */}
              <div className={`text-center p-8 rounded-2xl transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-pink-900/30 to-purple-900/30 border border-pink-700/30' 
                  : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200'
              }`}>
                <h3 className={`text-3xl font-bold mb-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🎉 Die perfekte Hochzeitsgalerie
                </h3>
                <p className={`text-lg mb-6 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Instagram-Style Sharing für den schönsten Tag im Leben
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <div className={`px-4 py-2 rounded-full transition-colors duration-300 ${
                    isDarkMode ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
                  }`}>
                    ✅ Mobile-First Design
                  </div>
                  <div className={`px-4 py-2 rounded-full transition-colors duration-300 ${
                    isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                  }`}>
                    🔒 Datenschutz-konform
                  </div>
                  <div className={`px-4 py-2 rounded-full transition-colors duration-300 ${
                    isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
                  }`}>
                    🚀 Production-Ready
                  </div>
                </div>
              </div>

              {/* Current Features */}
              <div>
                <h4 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🎯 Aktuelle Features
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentFeatures.map((feature, index) => (
                    <div key={index} className={`p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                      isDarkMode 
                        ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                        : 'bg-white border-gray-200 hover:bg-gray-50 shadow-lg'
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full transition-colors duration-300 ${
                          isDarkMode ? 'bg-pink-600' : 'bg-pink-500'
                        }`}>
                          {feature.icon}
                        </div>
                        <div className="flex-1">
                          <h5 className={`font-semibold mb-2 transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {feature.title}
                          </h5>
                          <p className={`text-sm mb-3 transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {feature.description}
                          </p>
                          <div className={`text-xs font-semibold px-3 py-1 rounded-full inline-block transition-colors duration-300 ${
                            isDarkMode ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
                          }`}>
                            {feature.highlight}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo Stats */}
              <div className={`p-6 rounded-xl transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
              }`}>
                <h4 className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  📊 Live Demo Statistiken
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-pink-400' : 'text-pink-600'
                    }`}>
                      100%
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Mobile Optimiert
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      &lt;1s
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Ladezeit
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      99.9%
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Uptime
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold transition-colors duration-300 ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      DSGVO
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Konform
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-8">
              <div>
                <h4 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🚀 Mögliche neue Features
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {potentialFeatures.map((feature, index) => (
                    <div key={index} className={`p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                      isDarkMode 
                        ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                        : 'bg-white border-gray-200 hover:bg-gray-50 shadow-lg'
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full transition-colors duration-300 ${
                          feature.category === 'Premium' ? 'bg-yellow-500' :
                          feature.category === 'E-Commerce' ? 'bg-green-500' :
                          feature.category === 'Social' ? 'bg-blue-500' :
                          feature.category === 'Interaktiv' ? 'bg-purple-500' :
                          'bg-pink-500'
                        }`}>
                          {feature.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className={`font-semibold transition-colors duration-300 ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {feature.title}
                            </h5>
                            <span className={`text-xs px-2 py-1 rounded-full transition-colors duration-300 ${
                              feature.category === 'Premium' ? 'bg-yellow-100 text-yellow-800' :
                              feature.category === 'E-Commerce' ? 'bg-green-100 text-green-800' :
                              feature.category === 'Social' ? 'bg-blue-100 text-blue-800' :
                              feature.category === 'Interaktiv' ? 'bg-purple-100 text-purple-800' :
                              'bg-pink-100 text-pink-800'
                            }`}>
                              {feature.category}
                            </span>
                          </div>
                          <p className={`text-sm transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Priority Matrix */}
              <div className={`p-6 rounded-xl transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
              }`}>
                <h4 className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🎯 Empfohlene Entwicklungsreihenfolge
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                    <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      ⭐ Bewertungssystem + 📱 QR-Code Sharing (Quick Wins)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                    <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      ⚡ Live Stories + 👁️ Live View Counter (Engagement)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                    <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      🎁 Geschenkeliste + 🌍 Live-Karte (Revenue Features)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
                    <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      👑 VIP Bereiche + 💕 Paar-Timeline (Premium Features)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-8">
              {/* Business Models */}
              <div>
                <h4 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  💰 Geschäftsmodelle
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {businessModels.map((model, index) => (
                    <div key={index} className={`p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                      isDarkMode 
                        ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                        : 'bg-white border-gray-200 hover:bg-gray-50 shadow-lg'
                    }`}>
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`p-3 rounded-full transition-colors duration-300 ${
                          isDarkMode ? 'bg-green-600' : 'bg-green-500'
                        }`}>
                          {model.icon}
                        </div>
                        <div className="flex-1">
                          <h5 className={`font-semibold mb-2 transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {model.title}
                          </h5>
                          <p className={`text-sm mb-3 transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {model.description}
                          </p>
                          <div className={`text-lg font-bold mb-3 transition-colors duration-300 ${
                            isDarkMode ? 'text-green-400' : 'text-green-600'
                          }`}>
                            {model.pricing}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {model.features.map((feature, fIndex) => (
                          <div key={fIndex} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className={`text-sm transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className={`mt-4 p-3 rounded-lg transition-colors duration-300 ${
                        model.potential.includes('Sehr hoch') ? 'bg-green-100 border border-green-200' :
                        model.potential.includes('Hoch') ? 'bg-blue-100 border border-blue-200' :
                        'bg-yellow-100 border border-yellow-200'
                      }`}>
                        <span className={`text-sm font-semibold ${
                          model.potential.includes('Sehr hoch') ? 'text-green-800' :
                          model.potential.includes('Hoch') ? 'text-blue-800' :
                          'text-yellow-800'
                        }`}>
                          Potenzial: {model.potential}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Implementation Roadmap */}
              <div>
                <h4 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🗺️ Umsetzungs-Roadmap
                </h4>
                <div className="space-y-6">
                  {implementationSteps.map((step, index) => (
                    <div key={index} className={`p-6 rounded-xl border transition-colors duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-700/50 border-gray-600' 
                        : 'bg-white border-gray-200 shadow-lg'
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white transition-colors duration-300 ${
                          index === 0 ? 'bg-green-500' :
                          index === 1 ? 'bg-blue-500' :
                          index === 2 ? 'bg-purple-500' :
                          'bg-orange-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <h5 className={`text-lg font-semibold transition-colors duration-300 ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {step.phase}
                            </h5>
                            <span className={`px-3 py-1 rounded-full text-sm transition-colors duration-300 ${
                              isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {step.duration}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-300 ${
                              isDarkMode ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
                            }`}>
                              {step.investment}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {step.tasks.map((task, tIndex) => (
                              <div key={tIndex} className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className={`text-sm transition-colors duration-300 ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                  {task}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Metrics */}
              <div className={`p-6 rounded-xl transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-green-900/30 to-blue-900/30 border border-green-700/30' 
                  : 'bg-gradient-to-br from-green-50 to-blue-50 border border-green-200'
              }`}>
                <h4 className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🎯 Erfolgspotenzial
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      50.000€+
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Jährliches Umsatzpotenzial
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      1.000+
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Hochzeiten pro Jahr (DE)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      85%
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Digitalisierungsgrad
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};