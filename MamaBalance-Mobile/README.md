# MamaBalance 💜

MamaBalance is a Flutter-based mobile application designed to support mothers by tracking postpartum depression risk and providing empathetic self-care suggestions.
It integrates **EPDS score assessments**, care reminders, emergency contacts, and supportive resources.

---

## 📱 Features

- 📝 Weekly **EPDS (Edinburgh Postnatal Depression Scale)** check-in
- 💡 Personalized **recommendations & self-care tips**
- 📊 Progress visualization with circular indicators
- 📞 **Emergency contacts** for quick help
- 🔔 Notifications and reminders
- 👩‍👧 Simple, user-friendly interface

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have installed:
- [Flutter](https://flutter.dev/docs/get-started/install) (>= 3.0)
- Android Studio / Xcode (for emulator or real device testing)
- Git

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/mamabalance.git
cd mamabalance
````

### 3. Install Dependencies

```bash
flutter pub get
```

### 4. Run the App

```bash
flutter run
```

---

## 📂 Project Structure

```
mamabalance/
│
├── android/              # Android native files
├── ios/                  # iOS native files
├── lib/                  # Main Flutter code
│   ├── main.dart         # Entry point
│   ├── screens/          # App screens
│   ├── widgets/          # Reusable UI components
│   ├── models/           # Data models (if any)
│   └── services/         # API/ML integration
│
├── assets/               # Images, icons, fonts
├── pubspec.yaml          # Dependencies
└── README.md             # Project documentation
```

---

## 🔧 Configuration

### App Icon

App icons are generated using [flutter_launcher_icons](https://pub.dev/packages/flutter_launcher_icons).
To regenerate icons:

```bash
flutter pub run flutter_launcher_icons
```

### Fonts & Assets

All assets are listed in `pubspec.yaml` under:

```yaml
flutter:
  assets:
    - assets/icon/
    - assets/images/
  fonts:
    - family: Poppins
      fonts:
        - asset: assets/fonts/Poppins-Regular.ttf
```

---

## 🛠️ Built With

* [Flutter](https://flutter.dev/) - Cross-platform UI toolkit
* [Provider](https://pub.dev/packages/provider) - State management
* [flutter_launcher_icons](https://pub.dev/packages/flutter_launcher_icons) - App icons
* [image_picker](https://pub.dev/packages/image_picker) - Capture images

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.

---

## 👩‍👧 Acknowledgments

* Edinburgh Postnatal Depression Scale (EPDS)
* Open-source Flutter community

```

---

Would you like me to also create a **minimal version** (short and clean) or do you prefer keeping this **detailed structured one**?
```
