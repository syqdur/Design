"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Heart,
  Camera,
  Mail,
  Share2,
  BarChart3,
  Users,
  Calendar,
  MapPin,
  MessageSquare,
  Star,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  ImageIcon,
  Sparkles,
  Copy,
  ExternalLink,
  Link,
  Check,
  Eye,
  ThumbsUp,
} from "lucide-react"

// Firebase Imports
import { db } from "../config/firebase"
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"

import { MediaItem } from '../types';
import { loadGallery } from '../services/firebaseService';

interface PostWeddingRecapProps {
  isDarkMode: boolean
  mediaItems: MediaItem[]
  isAdmin: boolean
  userName: string
}

interface Moment {
  id: string
  title: string
  description: string
  mediaItems: MediaItem[]
  category: "ceremony" | "reception" | "party" | "special" | "custom"
  timestamp: string
  location?: string
  tags: string[]
}

interface ThankYouCard {
  id: string
  recipientName: string
  recipientEmail: string
  message: string
  template: string
  selectedMoments: string[]
  status: "draft" | "ready"
  createdAt: string
  shareableLink: string
}

interface Analytics {
  totalViews: number
  uniqueVisitors: number
  averageTimeSpent: string
  mostViewedMoments: string[]
  feedback: Array<{
    id: string
    rating: number
    comment: string
    timestamp: string
  }>
}

// 🔥 Firebase Funktionen
const saveMomentToFirebase = async (momentData: Omit<Moment, "id">) => {
  try {
    console.log("💾 Speichere Moment in Firebase:", momentData)
    const docRef = await addDoc(collection(db, "moments"), {
      ...momentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Moment gespeichert mit ID:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("❌ Fehler beim Speichern des Moments:", error)
    throw error
  }
}

const updateMomentInFirebase = async (momentId: string, momentData: Omit<Moment, "id">) => {
  try {
    console.log("🔄 Aktualisiere Moment in Firebase:", momentId, momentData)
    const momentRef = doc(db, "moments", momentId)
    await updateDoc(momentRef, {
      ...momentData,
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Moment aktualisiert:", momentId)
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Moments:", error)
    throw error
  }
}

const deleteMomentFromFirebase = async (momentId: string) => {
  try {
    console.log("🗑️ Lösche Moment aus Firebase:", momentId)
    const momentRef = doc(db, "moments", momentId)
    await deleteDoc(momentRef)
    console.log("✅ Moment gelöscht:", momentId)
  } catch (error) {
    console.error("❌ Fehler beim Löschen des Moments:", error)
    throw error
  }
}

const loadMomentsFromFirebase = async (): Promise<Moment[]> => {
  try {
    console.log("📥 Lade Momente aus Firebase...")
    
    // Test Firebase connection first
    const testQuery = query(collection(db, "moments"), orderBy("timestamp", "desc"))
    const querySnapshot = await getDocs(testQuery)

    const moments = querySnapshot.docs.map(
      (doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          mediaItems: data.mediaItems || [], // Ensure mediaItems is always an array
        } as Moment
      }
    )

    console.log("✅ Momente geladen:", moments.length)
    return moments
  } catch (error) {
    console.error("❌ Fehler beim Laden der Momente:", error)
    // Return empty array instead of throwing to prevent app crash
    return []
  }
}

const saveCardToFirebase = async (cardData: Omit<ThankYouCard, "id">) => {
  try {
    console.log("💾 Speichere Dankeskarte in Firebase:", cardData)
    const docRef = await addDoc(collection(db, "thankYouCards"), {
      ...cardData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Dankeskarte gespeichert mit ID:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("❌ Fehler beim Speichern der Dankeskarte:", error)
    throw error
  }
}

const loadCardsFromFirebase = async (): Promise<ThankYouCard[]> => {
  try {
    console.log("📥 Lade Dankeskarten aus Firebase...")
    const q = query(collection(db, "thankYouCards"), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    const cards = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as ThankYouCard,
    )

    console.log("✅ Dankeskarten geladen:", cards.length)
    return cards
  } catch (error) {
    console.error("❌ Fehler beim Laden der Dankeskarten:", error)
    // Return empty array instead of throwing to prevent app crash
    return []
  }
}

const deleteCardFromFirebase = async (cardId: string) => {
  try {
    console.log("🗑️ Lösche Dankeskarte aus Firebase:", cardId)
    await deleteDoc(doc(db, "thankYouCards", cardId))
    console.log("✅ Dankeskarte gelöscht")
  } catch (error) {
    console.error("❌ Fehler beim Löschen der Dankeskarte:", error)
    throw error
  }
}

export const PostWeddingRecap: React.FC<PostWeddingRecapProps> = ({ isDarkMode, mediaItems, isAdmin, userName }) => {
  console.log("🚀 PostWeddingRecap wird geladen...", { isDarkMode, mediaItems, isAdmin, userName })

  const [activeSection, setActiveSection] = useState<"moments" | "cards" | "share" | "analytics">("moments")
  const [moments, setMoments] = useState<Moment[]>([])
  const [thankYouCards, setThankYouCards] = useState<ThankYouCard[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({
    totalViews: 0,
    uniqueVisitors: 0,
    averageTimeSpent: "0:00",
    mostViewedMoments: [],
    feedback: [],
  })

  // States für bessere UX
  const [localMediaItems, setLocalMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateMoment, setShowCreateMoment] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null)

  // State für Moment-Formular
  const [newMoment, setNewMoment] = useState({
    title: "",
    description: "",
    category: "special" as "ceremony" | "reception" | "party" | "special" | "custom",
    location: "",
    tags: [] as string[],
    mediaItems: [] as MediaItem[],
  })

  const [newCard, setNewCard] = useState({
    recipientName: "",
    recipientEmail: "",
    message: "",
    selectedMoments: [] as string[],
  })

  // 🔥 Firebase-Integration mit besserer Fehlerbehandlung
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("📊 Starte Daten-Loading...")
        setIsLoading(true)
        setError(null)

        // Versuche Firebase-Daten zu laden, verwende leere Arrays als Fallback
        let loadedMoments: Moment[] = []
        let loadedCards: ThankYouCard[] = []

        try {
          loadedMoments = await loadMomentsFromFirebase()
        } catch (momentError) {
          console.warn("⚠️ Momente konnten nicht geladen werden, verwende leere Liste:", momentError)
          loadedMoments = []
        }

        try {
          loadedCards = await loadCardsFromFirebase()
        } catch (cardError) {
          console.warn("⚠️ Dankeskarten konnten nicht geladen werden, verwende leere Liste:", cardError)
          loadedCards = []
        }

        setMoments(loadedMoments)
        setThankYouCards(loadedCards)

        // Load gallery data directly from Firebase
        const unsubscribeGallery = loadGallery(setLocalMediaItems)
        
        // Clean up subscription when component unmounts
        return () => {
          if (unsubscribeGallery) unsubscribeGallery()
        }

        // Sample analytics
        setAnalytics({
          totalViews: 1247,
          uniqueVisitors: 89,
          averageTimeSpent: "4:32",
          mostViewedMoments: loadedMoments.slice(0, 2).map((m) => m.title),
          feedback: [
            {
              id: "1",
              rating: 5,
              comment: "Wunderschöne Zusammenfassung! Vielen Dank für die tollen Erinnerungen.",
              timestamp: new Date().toISOString(),
            },
            {
              id: "2",
              rating: 5,
              comment: "Es war ein magischer Tag. Danke, dass wir dabei sein durften!",
              timestamp: new Date().toISOString(),
            },
          ],
        })

        console.log("✅ Daten-Loading abgeschlossen!")
      } catch (error) {
        console.error("❌ Kritischer Fehler beim Laden der Daten:", error)
        // Nicht den gesamten Fehler als String anzeigen - das kann zu Rendering-Problemen führen
        setError("Verbindung zur Datenbank fehlgeschlagen. Bitte versuche es erneut.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // 🔥 Echte Moment-Erstellung
  const handleCreateMoment = () => {
    console.log("➕ Moment-Erstellung gestartet")
    setShowCreateMoment(true)
    setError(null)
  }

  const handleSaveMoment = async () => {
    try {
      console.log("💾 Speichere neuen Moment:", newMoment)

      // Validierung
      if (!newMoment.title.trim()) {
        setError("Bitte gib einen Titel für den Moment ein.")
        return
      }

      if (!newMoment.description.trim()) {
        setError("Bitte gib eine Beschreibung ein.")
        return
      }

      setIsSaving(true)
      setError(null)

      // Moment-Daten vorbereiten
      const momentData: Omit<Moment, "id"> = {
        title: newMoment.title.trim(),
        description: newMoment.description.trim(),
        category: newMoment.category,
        location: newMoment.location.trim(),
        tags: newMoment.tags,
        mediaItems: newMoment.mediaItems,
        timestamp: new Date().toISOString(),
      }

      try {
        // In Firebase speichern
        const momentId = await saveMomentToFirebase(momentData)

        // Lokalen State aktualisieren
        const newMomentWithId: Moment = {
          id: momentId,
          ...momentData,
        }

        setMoments((prev) => [newMomentWithId, ...prev])

        // Formular zurücksetzen
        setNewMoment({
          title: "",
          description: "",
          category: "special",
          location: "",
          tags: [],
          mediaItems: [],
        })

        setShowCreateMoment(false)

        // Erfolg-Feedback
        console.log("✅ Moment erfolgreich gespeichert!")
        alert("Moment erfolgreich gespeichert!")
      } catch (saveError) {
        console.error("❌ Firebase-Fehler beim Speichern:", saveError)
        setError("Moment konnte nicht gespeichert werden. Bitte überprüfe die Verbindung.")
        
        // Lokalen State trotzdem aktualisieren mit temporärer ID
        const tempMomentWithId: Moment = {
          id: `temp-${Date.now()}`,
          ...momentData,
        }
        setMoments((prev) => [tempMomentWithId, ...prev])
        
        // Formular zurücksetzen
        setNewMoment({
          title: "",
          description: "",
          category: "special",
          location: "",
          tags: [],
          mediaItems: [],
        })
        setShowCreateMoment(false)
        
        alert("Moment wurde lokal hinzugefügt, aber konnte nicht in der Datenbank gespeichert werden.")
      }
    } catch (error) {
      console.error("❌ Allgemeiner Fehler beim Speichern des Moments:", error)
      setError("Ein unerwarteter Fehler ist aufgetreten.")
    } finally {
      setIsSaving(false)
    }
  }

  // 🔥 Moment bearbeiten
  const handleEditMoment = (moment: Moment) => {
    console.log("✏️ Bearbeite Moment:", moment.id)
    setSelectedMoment(moment)
    setNewMoment({
      title: moment.title,
      description: moment.description,
      category: moment.category,
      location: moment.location || "",
      tags: moment.tags,
      mediaItems: moment.mediaItems,
    })
    setShowCreateMoment(true)
    setError(null)
  }

  // 🔥 Moment löschen
  const handleDeleteMoment = async (moment: Moment) => {
    if (!confirm(`Möchtest du den Moment "${moment.title}" wirklich löschen?`)) {
      return
    }

    try {
      console.log("🗑️ Lösche Moment:", moment.id)
      setIsSaving(true)
      setError(null)

      // Aus Firebase löschen
      await deleteMomentFromFirebase(moment.id)

      // Lokalen State aktualisieren
      setMoments((prev) => prev.filter((m) => m.id !== moment.id))

      console.log("✅ Moment erfolgreich gelöscht!")
      alert("Moment erfolgreich gelöscht!")
    } catch (deleteError) {
      console.error("❌ Fehler beim Löschen des Moments:", deleteError)
      setError("Moment konnte nicht gelöscht werden. Bitte versuche es erneut.")
      alert("Fehler beim Löschen des Moments.")
    } finally {
      setIsSaving(false)
    }
  }

  // 🔥 Moment aktualisieren (für Edit-Modus)
  const handleUpdateMoment = async () => {
    if (!selectedMoment) return

    try {
      console.log("🔄 Aktualisiere Moment:", selectedMoment.id)

      // Validierung
      if (!newMoment.title.trim()) {
        setError("Bitte gib einen Titel für den Moment ein.")
        return
      }

      if (!newMoment.description.trim()) {
        setError("Bitte gib eine Beschreibung ein.")
        return
      }

      setIsSaving(true)
      setError(null)

      // Aktualisierte Moment-Daten vorbereiten
      const updatedMomentData: Omit<Moment, "id"> = {
        title: newMoment.title.trim(),
        description: newMoment.description.trim(),
        category: newMoment.category,
        location: newMoment.location.trim(),
        tags: newMoment.tags,
        mediaItems: newMoment.mediaItems,
        timestamp: selectedMoment.timestamp, // Ursprünglichen Zeitstempel beibehalten
      }

      // In Firebase aktualisieren
      await updateMomentInFirebase(selectedMoment.id, updatedMomentData)

      // Lokalen State aktualisieren
      const updatedMoment: Moment = {
        id: selectedMoment.id,
        ...updatedMomentData,
      }

      setMoments((prev) => prev.map((m) => m.id === selectedMoment.id ? updatedMoment : m))

      // Formular zurücksetzen
      setNewMoment({
        title: "",
        description: "",
        category: "special",
        location: "",
        tags: [],
        mediaItems: [],
      })

      setSelectedMoment(null)
      setShowCreateMoment(false)

      console.log("✅ Moment erfolgreich aktualisiert!")
      alert("Moment erfolgreich aktualisiert!")
    } catch (updateError) {
      console.error("❌ Fehler beim Aktualisieren des Moments:", updateError)
      setError("Moment konnte nicht aktualisiert werden. Bitte versuche es erneut.")
    } finally {
      setIsSaving(false)
    }
  }

  // 🔥 Echte Dankeskarten-Erstellung
  const handleCreateCard = () => {
    console.log("💌 Dankeskarten-Erstellung gestartet")
    setShowCreateCard(true)
    setError(null)
  }

  const handleSubmitCard = async () => {
    try {
      console.log("💾 Speichere neue Dankeskarte:", newCard)

      // Validierung
      if (!newCard.recipientName.trim()) {
        setError("Bitte gib einen Namen für den Empfänger ein.")
        return
      }

      if (newCard.selectedMoments.length === 0) {
        setError("Bitte wähle mindestens einen Moment aus.")
        return
      }

      setIsSaving(true)
      setError(null)

      // Karten-Daten vorbereiten
      const cardData: Omit<ThankYouCard, "id"> = {
        recipientName: newCard.recipientName.trim(),
        recipientEmail: newCard.recipientEmail.trim(),
        message: newCard.message.trim(),
        template: "elegant",
        selectedMoments: newCard.selectedMoments,
        status: "ready",
        createdAt: new Date().toISOString(),
        shareableLink: "", // Wird nach dem Speichern generiert
      }

      try {
        // In Firebase speichern
        const cardId = await saveCardToFirebase(cardData)

        // Shareable Link generieren
        const encodedName = encodeURIComponent(newCard.recipientName)
        const shareableLink = `${window.location.origin}/recap?for=${encodedName}&id=${cardId}`

        // Link in Firebase aktualisieren
        try {
          await updateDoc(doc(db, "thankYouCards", cardId), {
            shareableLink,
          })
        } catch (updateError) {
          console.warn("⚠️ Link konnte nicht aktualisiert werden:", updateError)
        }

        // Lokalen State aktualisieren
        const newCardWithId: ThankYouCard = {
          id: cardId,
          ...cardData,
          shareableLink,
        }

        setThankYouCards((prev) => [newCardWithId, ...prev])

        // Formular zurücksetzen
        setNewCard({
          recipientName: "",
          recipientEmail: "",
          message: "",
          selectedMoments: [],
        })

        setShowCreateCard(false)

        // Erfolg-Feedback
        console.log("✅ Dankeskarte erfolgreich erstellt!")
        alert("Dankeskarte erfolgreich erstellt!")
      } catch (saveError) {
        console.error("❌ Firebase-Fehler beim Erstellen der Dankeskarte:", saveError)
        setError("Dankeskarte konnte nicht gespeichert werden. Bitte überprüfe die Verbindung.")
        
        // Lokalen State trotzdem aktualisieren mit temporärer ID
        const tempCardWithId: ThankYouCard = {
          id: `temp-card-${Date.now()}`,
          ...cardData,
          shareableLink: `${window.location.origin}/recap?for=${encodeURIComponent(newCard.recipientName)}&temp=true`,
        }
        setThankYouCards((prev) => [tempCardWithId, ...prev])
        
        // Formular zurücksetzen
        setNewCard({
          recipientName: "",
          recipientEmail: "",
          message: "",
          selectedMoments: [],
        })
        setShowCreateCard(false)
        
        alert("Dankeskarte wurde lokal erstellt, aber konnte nicht in der Datenbank gespeichert werden.")
      }
    } catch (error) {
      console.error("❌ Allgemeiner Fehler beim Erstellen der Dankeskarte:", error)
      setError("Ein unerwarteter Fehler ist aufgetreten.")
    } finally {
      setIsSaving(false)
    }
  }

  // 🔥 Echte Lösch-Funktion
  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm("Dankeskarte wirklich löschen?")) {
      return
    }

    try {
      console.log("🗑️ Lösche Dankeskarte:", cardId)
      setIsSaving(true)
      setError(null)

      // Aus Firebase löschen
      await deleteCardFromFirebase(cardId)

      // Lokalen State aktualisieren
      setThankYouCards((prev) => prev.filter((card) => card.id !== cardId))

      console.log("✅ Dankeskarte erfolgreich gelöscht!")
      alert("Dankeskarte erfolgreich gelöscht!")
    } catch (error) {
      console.error("❌ Fehler beim Löschen der Dankeskarte:", error)
      setError(`Fehler beim Löschen der Dankeskarte: ${error}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Weitere Funktionen
  const handleShareRecap = () => {
    const shareUrl = `${window.location.origin}/recap/kristin-maurizio`
    navigator.clipboard.writeText(shareUrl)
    alert("Link zur Zusammenfassung wurde in die Zwischenablage kopiert!")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ceremony":
        return <Heart className="w-5 h-5" />
      case "reception":
        return <Users className="w-5 h-5" />
      case "party":
        return <Sparkles className="w-5 h-5" />
      case "special":
        return <Star className="w-5 h-5" />
      default:
        return <Camera className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "ceremony":
        return "bg-pink-500"
      case "reception":
        return "bg-blue-500"
      case "party":
        return "bg-purple-500"
      case "special":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    alert("Link wurde in die Zwischenablage kopiert!")
  }

  const handleToggleMomentSelection = (momentId: string) => {
    setNewCard((prev) => {
      const selected = [...prev.selectedMoments]
      return selected.includes(momentId)
        ? { ...prev, selectedMoments: selected.filter((id) => id !== momentId) }
        : { ...prev, selectedMoments: [...selected, momentId] }
    })
  }

  // Error Handling für weiße Seiten
  if (error) {
    console.error("💥 Error State aktiv:", error)
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <X className="w-16 h-16 mx-auto" />
          </div>
          <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Ups! Etwas ist schiefgelaufen
          </h2>
          <p className={`mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{error}</p>
          <button
            onClick={() => {
              setError(null)
              window.location.reload()
            }}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Seite neu laden
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    console.log("⏳ Loading State aktiv...")
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className={`text-lg transition-colors duration-300 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Lade Post-Hochzeits-Zusammenfassung...
          </p>
          <p
            className={`text-sm mt-2 transition-colors duration-300 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Verbinde mit Firebase...
          </p>
        </div>
      </div>
    )
  }

  console.log("🎉 Komponente wird gerendert:", { moments: moments.length, cards: thankYouCards.length })

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <div
        className={`border-b transition-colors duration-300 ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.close()}
                className={`p-2 rounded-full transition-colors duration-300 ${
                  isDarkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-full transition-colors duration-300 ${
                    isDarkMode ? "bg-pink-600" : "bg-pink-500"
                  }`}
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1
                    className={`text-3xl font-bold transition-colors duration-300 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    💕 Post-Hochzeits-Zusammenfassung
                  </h1>
                  <p
                    className={`text-lg transition-colors duration-300 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Kristin & Maurizio • 12. Juli 2025
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShareRecap}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors duration-300 ${
                  isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                <Share2 className="w-4 h-4" />
                Teilen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={`border-b transition-colors duration-300 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: "moments", label: "Momente sammeln", icon: <Camera className="w-4 h-4" /> },
              { id: "cards", label: "Dankeskarten", icon: <Mail className="w-4 h-4" /> },
              { id: "share", label: "Teilen & Verteilen", icon: <Share2 className="w-4 h-4" /> },
              { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium transition-all duration-300 ${
                  activeSection === tab.id
                    ? isDarkMode
                      ? "border-pink-400 text-pink-400"
                      : "border-pink-600 text-pink-600"
                    : isDarkMode
                      ? "border-transparent text-gray-400 hover:text-gray-200"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === "moments" && (
          <div>
            {/* Moments Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2
                  className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  📸 Momente sammeln
                </h2>
                <p className={`transition-colors duration-300 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Wähle und organisiere die schönsten Erinnerungen von eurer Hochzeit ({moments.length} Momente)
                </p>
              </div>
              <button
                onClick={handleCreateMoment}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors duration-300 ${
                  isSaving
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : isDarkMode
                      ? "bg-pink-600 hover:bg-pink-700 text-white"
                      : "bg-pink-500 hover:bg-pink-600 text-white"
                }`}
              >
                <Plus className="w-4 h-4" />
                {isSaving ? "Speichere..." : "Moment hinzufügen"}
              </button>
            </div>

            {/* Moments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {moments.map((moment) => (
                <div
                  key={moment.id}
                  className={`rounded-2xl border transition-all duration-300 hover:scale-105 cursor-pointer ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
                      : "bg-white border-gray-200 hover:bg-gray-50 shadow-lg"
                  }`}
                  onClick={() => setSelectedMoment(moment)}
                >
                  {/* Moment Header */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full text-white ${getCategoryColor(moment.category)}`}>
                          {getCategoryIcon(moment.category)}
                        </div>
                        <div>
                          <h3
                            className={`font-semibold transition-colors duration-300 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {moment.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar
                              className={`w-3 h-3 transition-colors duration-300 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            />
                            <span
                              className={`transition-colors duration-300 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {formatDate(moment.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditMoment(moment)
                          }}
                          className={`p-2 rounded-lg transition-colors duration-300 ${
                            isDarkMode 
                              ? "hover:bg-gray-600 text-gray-400 hover:text-white" 
                              : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          }`}
                          title="Moment bearbeiten"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteMoment(moment)
                          }}
                          className={`p-2 rounded-lg transition-colors duration-300 ${
                            isDarkMode 
                              ? "hover:bg-red-900 text-gray-400 hover:text-red-400" 
                              : "hover:bg-red-50 text-gray-500 hover:text-red-600"
                          }`}
                          title="Moment löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p
                      className={`text-sm mb-4 transition-colors duration-300 ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {moment.description}
                    </p>

                    {/* Media Preview */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {(moment.mediaItems || []).slice(0, 3).map((media, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                          {media.type === "image" && media.url ? (
                            <img
                              src={media.url || "/placeholder.svg"}
                              alt={media.name}
                              className="w-full h-full object-cover"
                            />
                          ) : media.type === "video" && media.url ? (
                            <video src={media.url} className="w-full h-full object-cover" muted />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {media.type === "note" ? (
                                <MessageSquare className="w-6 h-6 text-gray-400" />
                              ) : (
                                <Camera className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {moment.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded-full text-xs transition-colors duration-300 ${
                            isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                      {moment.tags.length > 3 && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs transition-colors duration-300 ${
                            isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          +{moment.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Moment Footer */}
                  <div
                    className={`px-6 py-4 border-t flex items-center justify-between transition-colors duration-300 ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <ImageIcon
                          className={`w-4 h-4 transition-colors duration-300 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        />
                        <span
                          className={`transition-colors duration-300 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {(moment.mediaItems || []).length}
                        </span>
                      </div>
                      {moment.location && (
                        <div className="flex items-center gap-1">
                          <MapPin
                            className={`w-4 h-4 transition-colors duration-300 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          />
                          <span
                            className={`transition-colors duration-300 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {moment.location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Moment Card */}
              <div
                onClick={handleCreateMoment}
                className={`rounded-2xl border-2 border-dashed transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center min-h-[300px] ${
                  isDarkMode
                    ? "border-gray-600 hover:border-gray-500 hover:bg-gray-800/50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div className="text-center">
                  <Plus
                    className={`w-12 h-12 mx-auto mb-4 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  />
                  <h3
                    className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Neuen Moment hinzufügen
                  </h3>
                  <p
                    className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    Sammle weitere Erinnerungen
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "cards" && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2
                  className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  💌 Dankeskarten
                </h2>
                <p className={`transition-colors duration-300 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Erstelle personalisierte Dankeskarten mit individuellen Links für eure Gäste ({thankYouCards.length}{" "}
                  Karten)
                </p>
              </div>
              <button
                onClick={handleCreateCard}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors duration-300 ${
                  isSaving
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : isDarkMode
                      ? "bg-pink-600 hover:bg-pink-700 text-white"
                      : "bg-pink-500 hover:bg-pink-600 text-white"
                }`}
              >
                <Plus className="w-4 h-4" />
                {isSaving ? "Erstelle..." : "Dankeskarte erstellen"}
              </button>
            </div>

            {/* Cards Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Thank You Cards */}
              {thankYouCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-2xl border p-6 transition-colors duration-300 ${
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3
                      className={`font-semibold transition-colors duration-300 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {card.recipientName}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs transition-colors duration-300 ${
                        card.status === "ready"
                          ? isDarkMode
                            ? "bg-green-600 text-white"
                            : "bg-green-100 text-green-800"
                          : isDarkMode
                            ? "bg-yellow-600 text-white"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {card.status === "ready" ? "Bereit" : "Entwurf"}
                    </span>
                  </div>

                  <p
                    className={`text-sm mb-4 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {card.message.length > 100 ? `${card.message.substring(0, 100)}...` : card.message}
                  </p>

                  <div className="flex items-center gap-2 text-sm mb-4">
                    <Calendar
                      className={`w-4 h-4 transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                    <span
                      className={`transition-colors duration-300 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Erstellt am {new Date(card.createdAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>

                  {/* Shareable Link Section */}
                  <div
                    className={`p-3 rounded-lg mb-4 transition-colors duration-300 ${
                      isDarkMode ? "bg-blue-900/20 border border-blue-700/30" : "bg-blue-50 border border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-medium transition-colors duration-300 ${
                          isDarkMode ? "text-blue-300" : "text-blue-700"
                        }`}
                      >
                        Persönlicher Link:
                      </span>
                      <button
                        onClick={() => handleCopyLink(card.shareableLink)}
                        className={`p-1 rounded transition-colors duration-300 ${
                          isDarkMode ? "hover:bg-blue-800 text-blue-300" : "hover:bg-blue-100 text-blue-600"
                        }`}
                        title="Link kopieren"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div
                      className={`text-xs font-mono p-2 rounded transition-colors duration-300 ${
                        isDarkMode ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600"
                      }`}
                    >
                      {card.shareableLink}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyLink(card.shareableLink)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      <Link className="w-4 h-4" />
                      Link teilen
                    </button>

                    <a
                      href={card.shareableLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Vorschau
                    </a>

                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      disabled={isSaving}
                      className={`p-2 rounded-lg transition-colors duration-300 ${
                        isSaving
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : isDarkMode
                            ? "bg-red-600/20 hover:bg-red-600/40 text-red-400"
                            : "bg-red-50 hover:bg-red-100 text-red-600"
                      }`}
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Card */}
              <div
                onClick={handleCreateCard}
                className={`rounded-2xl border-2 border-dashed transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center min-h-[200px] ${
                  isDarkMode
                    ? "border-gray-600 hover:border-gray-500 hover:bg-gray-800/50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div className="text-center">
                  <Mail
                    className={`w-8 h-8 mx-auto mb-2 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Neue Dankeskarte
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "share" && (
          <div>
            <h2
              className={`text-2xl font-bold mb-8 transition-colors duration-300 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              🌐 Teilen & Verteilen
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Share Options */}
              <div
                className={`rounded-2xl border p-6 transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-lg"
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Freigabe-Optionen
                </h3>

                <div className="space-y-4">
                  <button
                    onClick={handleShareRecap}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    <Share2 className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">Direkter Link</div>
                      <div className="text-sm opacity-90">Link kopieren und teilen</div>
                    </div>
                  </button>

                  <button
                    onClick={handleCreateCard}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    <Link className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">Personalisierter Link</div>
                      <div className="text-sm opacity-90">Erstelle individuelle Links für Gäste</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Share Preview */}
              <div
                className={`rounded-2xl border p-6 transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-lg"
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Vorschau
                </h3>

                <div
                  className={`p-4 rounded-lg transition-colors duration-300 ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">💕</div>
                    <h4
                      className={`font-semibold mb-2 transition-colors duration-300 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Kristin & Maurizio
                    </h4>
                    <p
                      className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Unsere Hochzeits-Zusammenfassung
                    </p>
                    <p
                      className={`text-xs mt-2 transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      12. Juli 2025
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "analytics" && (
          <div>
            <h2
              className={`text-2xl font-bold mb-8 transition-colors duration-300 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              📊 Analytics & Einblicke
            </h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div
                className={`rounded-2xl border p-6 transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-lg"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  <span
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Aufrufe
                  </span>
                </div>
                <div
                  className={`text-3xl font-bold transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {analytics.totalViews.toLocaleString()}
                </div>
              </div>

              <div
                className={`rounded-2xl border p-6 transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-lg"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-green-500" />
                  <span
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Besucher
                  </span>
                </div>
                <div
                  className={`text-3xl font-bold transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {analytics.uniqueVisitors}
                </div>
              </div>

              <div
                className={`rounded-2xl border p-6 transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-lg"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <span
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Verweildauer
                  </span>
                </div>
                <div
                  className={`text-3xl font-bold transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {analytics.averageTimeSpent}
                </div>
              </div>

              <div
                className={`rounded-2xl border p-6 transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-lg"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <ThumbsUp className="w-5 h-5 text-yellow-500" />
                  <span
                    className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Bewertung
                  </span>
                </div>
                <div
                  className={`text-3xl font-bold transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  4.9/5
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div
              className={`rounded-2xl border p-6 transition-colors duration-300 ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-lg"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                💬 Gäste-Feedback
              </h3>

              <div className="space-y-4">
                {analytics.feedback.map((feedback) => (
                  <div
                    key={feedback.id}
                    className={`p-4 rounded-lg transition-colors duration-300 ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < feedback.rating ? "text-yellow-500 fill-current" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-sm transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {formatDate(feedback.timestamp)}
                      </span>
                    </div>
                    <p
                      className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      "{feedback.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Moment Modal */}
      {showCreateMoment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div
            className={`rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between p-6 border-b transition-colors duration-300 ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <h3
                className={`text-xl font-semibold transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Neuen Moment hinzufügen
              </h3>
              <button
                onClick={() => setShowCreateMoment(false)}
                className={`p-2 rounded-full transition-colors duration-300 ${
                  isDarkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={newMoment.title}
                    onChange={(e) => setNewMoment({ ...newMoment, title: e.target.value })}
                    placeholder="z.B. Die Zeremonie"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Beschreibung *
                  </label>
                  <textarea
                    value={newMoment.description}
                    onChange={(e) => setNewMoment({ ...newMoment, description: e.target.value })}
                    placeholder="Beschreibe diesen besonderen Moment..."
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Kategorie
                  </label>
                  <select
                    value={newMoment.category}
                    onChange={(e) => setNewMoment({ ...newMoment, category: e.target.value as any })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                      isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="ceremony">Zeremonie</option>
                    <option value="reception">Empfang</option>
                    <option value="party">Party</option>
                    <option value="special">Besonders</option>
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Ort (optional)
                  </label>
                  <input
                    type="text"
                    value={newMoment.location}
                    onChange={(e) => setNewMoment({ ...newMoment, location: e.target.value })}
                    placeholder="z.B. St. Marien Kirche"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                  />
                </div>

                {/* Media Selection Section */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Medien auswählen (optional)
                  </label>
                  <div
                    className={`border rounded-lg p-4 max-h-48 overflow-y-auto transition-colors duration-300 ${
                      isDarkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    {localMediaItems.length === 0 ? (
                      <div className="text-center p-6">
                        <div className="mb-4">
                          <ImageIcon className={`w-12 h-12 mx-auto mb-2 transition-colors duration-300 ${
                            isDarkMode ? "text-gray-500" : "text-gray-400"
                          }`} />
                        </div>
                        <p
                          className={`text-sm mb-3 transition-colors duration-300 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Keine Medien in der Galerie gefunden
                        </p>
                        <p
                          className={`text-xs transition-colors duration-300 ${
                            isDarkMode ? "text-gray-500" : "text-gray-600"
                          }`}
                        >
                          Gehe zur Hauptgalerie und lade Fotos hoch, um sie hier auswählen zu können.
                        </p>
                        <button
                          onClick={() => window.location.href = '/'}
                          className={`mt-3 px-4 py-2 text-sm rounded-lg transition-colors duration-300 ${
                            isDarkMode
                              ? "bg-pink-600 hover:bg-pink-700 text-white"
                              : "bg-pink-500 hover:bg-pink-600 text-white"
                          }`}
                        >
                          Zur Galerie
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {localMediaItems.map((media) => (
                          <div
                            key={media.id}
                            onClick={() => {
                              const isSelected = newMoment.mediaItems.some(m => m.id === media.id)
                              if (isSelected) {
                                setNewMoment({
                                  ...newMoment,
                                  mediaItems: newMoment.mediaItems.filter(m => m.id !== media.id)
                                })
                              } else {
                                setNewMoment({
                                  ...newMoment,
                                  mediaItems: [...newMoment.mediaItems, media]
                                })
                              }
                            }}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                              newMoment.mediaItems.some(m => m.id === media.id)
                                ? "ring-2 ring-pink-500 ring-offset-2"
                                : "hover:scale-105"
                            } ${isDarkMode ? "ring-offset-gray-700" : "ring-offset-white"}`}
                          >
                            {media.type === "image" && media.url ? (
                              <img
                                src={media.url}
                                alt={media.name}
                                className="w-full h-full object-cover"
                              />
                            ) : media.type === "video" && media.url ? (
                              <video
                                src={media.url}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : media.type === "note" ? (
                              <div className={`w-full h-full flex items-center justify-center transition-colors duration-300 ${
                                isDarkMode ? "bg-gray-600" : "bg-gray-200"
                              }`}>
                                <MessageSquare className="w-6 h-6 text-gray-400" />
                              </div>
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center transition-colors duration-300 ${
                                isDarkMode ? "bg-gray-600" : "bg-gray-200"
                              }`}>
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            
                            {/* Selection Indicator */}
                            {newMoment.mediaItems.some(m => m.id === media.id) && (
                              <div className="absolute top-1 right-1 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                            
                            {/* Media Type Badge */}
                            <div className="absolute bottom-1 left-1 px-2 py-1 bg-black bg-opacity-75 rounded text-xs text-white">
                              {media.type === "image" ? "📸" : media.type === "video" ? "🎥" : "📝"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Media Count */}
                  {newMoment.mediaItems.length > 0 && (
                    <p
                      className={`text-sm mt-2 transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {newMoment.mediaItems.length} {newMoment.mediaItems.length === 1 ? "Medium" : "Medien"} ausgewählt
                    </p>
                  )}
                </div>

                {error && <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-700">{error}</div>}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className={`p-6 border-t transition-colors duration-300 ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateMoment(false)}
                  disabled={isSaving}
                  className={`py-2 px-4 rounded-lg transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveMoment}
                  disabled={isSaving || !newMoment.title.trim() || !newMoment.description.trim()}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg transition-colors duration-300 ${
                    isSaving || !newMoment.title.trim() || !newMoment.description.trim()
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : isDarkMode
                        ? "bg-pink-600 hover:bg-pink-700 text-white"
                        : "bg-pink-500 hover:bg-pink-600 text-white"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Speichere..." : "Moment speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Card Modal */}
      {showCreateCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div
            className={`rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between p-6 border-b transition-colors duration-300 ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <h3
                className={`text-xl font-semibold transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Neue Dankeskarte erstellen
              </h3>
              <button
                onClick={() => setShowCreateCard(false)}
                className={`p-2 rounded-full transition-colors duration-300 ${
                  isDarkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form */}
                <div>
                  <div className="space-y-4">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Empfänger Name *
                      </label>
                      <input
                        type="text"
                        value={newCard.recipientName}
                        onChange={(e) => setNewCard({ ...newCard, recipientName: e.target.value })}
                        placeholder="z.B. Familie Schmidt"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        E-Mail (optional)
                      </label>
                      <input
                        type="email"
                        value={newCard.recipientEmail}
                        onChange={(e) => setNewCard({ ...newCard, recipientEmail: e.target.value })}
                        placeholder="email@beispiel.de"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Persönliche Nachricht
                      </label>
                      <textarea
                        value={newCard.message}
                        onChange={(e) => setNewCard({ ...newCard, message: e.target.value })}
                        placeholder="Schreibe eine persönliche Nachricht..."
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none transition-colors duration-300 ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        }`}
                      />
                    </div>

                    <div
                      className={`p-4 rounded-lg transition-colors duration-300 ${
                        isDarkMode ? "bg-blue-900/20 border border-blue-700/30" : "bg-blue-50 border border-blue-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          className={`w-4 h-4 transition-colors duration-300 ${
                            isDarkMode ? "text-blue-400" : "text-blue-600"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium transition-colors duration-300 ${
                            isDarkMode ? "text-blue-300" : "text-blue-700"
                          }`}
                        >
                          Persönlicher Link wird generiert
                        </span>
                      </div>
                      <p
                        className={`text-xs transition-colors duration-300 ${
                          isDarkMode ? "text-blue-200" : "text-blue-600"
                        }`}
                      >
                        Nach dem Erstellen erhältst du einen individuellen Link, den du mit{" "}
                        {newCard.recipientName || "dem Empfänger"} teilen kannst.
                      </p>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-700">{error}</div>
                    )}
                  </div>
                </div>

                {/* Moment Selection */}
                <div>
                  <h4
                    className={`text-sm font-medium mb-3 transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Momente auswählen *
                  </h4>

                  <div
                    className={`max-h-[300px] overflow-y-auto p-2 rounded-lg transition-colors duration-300 ${
                      isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                    }`}
                  >
                    {moments.map((moment) => (
                      <div
                        key={moment.id}
                        className={`flex items-center gap-3 p-3 mb-2 rounded-lg cursor-pointer transition-colors duration-300 ${
                          newCard.selectedMoments.includes(moment.id)
                            ? isDarkMode
                              ? "bg-pink-900/30 border border-pink-700/30"
                              : "bg-pink-50 border border-pink-200"
                            : isDarkMode
                              ? "bg-gray-800 hover:bg-gray-700 border border-gray-700"
                              : "bg-white hover:bg-gray-100 border border-gray-200"
                        }`}
                        onClick={() => handleToggleMomentSelection(moment.id)}
                      >
                        <div
                          className={`w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 ${
                            newCard.selectedMoments.includes(moment.id) ? "ring-2 ring-pink-500" : ""
                          }`}
                        >
                          {moment.mediaItems[0]?.type === "image" && moment.mediaItems[0]?.url ? (
                            <img
                              src={moment.mediaItems[0].url || "/placeholder.svg"}
                              alt={moment.title}
                              className="w-full h-full object-cover"
                            />
                          ) : moment.mediaItems[0]?.type === "video" && moment.mediaItems[0]?.url ? (
                            <video src={moment.mediaItems[0].url} className="w-full h-full object-cover" muted />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h5
                            className={`font-medium truncate transition-colors duration-300 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {moment.title}
                          </h5>
                          <p
                            className={`text-xs truncate transition-colors duration-300 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {(moment.mediaItems || []).length} Medien • {moment.category}
                          </p>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-300 ${
                            newCard.selectedMoments.includes(moment.id)
                              ? "bg-pink-500 text-white"
                              : isDarkMode
                                ? "bg-gray-600 text-gray-400"
                                : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {newCard.selectedMoments.includes(moment.id) ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`mt-3 text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {newCard.selectedMoments.length} von {moments.length} Momenten ausgewählt
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className={`p-6 border-t transition-colors duration-300 ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateCard(false)}
                  disabled={isSaving}
                  className={`py-2 px-4 rounded-lg transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSubmitCard}
                  disabled={isSaving || !newCard.recipientName.trim() || newCard.selectedMoments.length === 0}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg transition-colors duration-300 ${
                    isSaving || !newCard.recipientName.trim() || newCard.selectedMoments.length === 0
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : isDarkMode
                        ? "bg-pink-600 hover:bg-pink-700 text-white"
                        : "bg-pink-500 hover:bg-pink-600 text-white"
                  }`}
                >
                  <Link className="w-4 h-4" />
                  {isSaving ? "Erstelle..." : "Link erstellen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
