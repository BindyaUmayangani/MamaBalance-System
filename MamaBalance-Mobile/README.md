# MamaBalance 💜

MamaBalance is a Flutter-based mobile application designed to support mothers by detecting postpartum depression risk and providing personalized mood recommendations.  
It integrates **EPDS score assessments**, **AI-powered mood prediction**, and **empathetic self-care suggestions**.

---

## 📱 Features

- 📝 Weekly **EPDS (Edinburgh Postnatal Depression Scale)** check-in
- 🤖 AI-powered **mood detection** from facial expressions
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
│   ├── screens/          # App screens (ScoreScreen, MoodCapture, etc.)
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

## 📊 AI Model Integration

* Facial expression recognition is trained on the [Kaggle FER dataset](https://www.kaggle.com/datasets/deadskull7/fer2013).
* Model converted into **TensorFlow Lite** and integrated with `tflite_flutter` package.
* Prediction pipeline:

  1. Capture image →
  2. Preprocess (resize, grayscale) →
  3. Run inference →
  4. Display predicted mood

---

## 🛠️ Built With

* [Flutter](https://flutter.dev/) - Cross-platform UI toolkit
* [TensorFlow Lite](https://www.tensorflow.org/lite) - AI/ML model inference
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

* Kaggle [FER2013 Dataset](https://www.kaggle.com/datasets/deadskull7/fer2013)
* Edinburgh Postnatal Depression Scale (EPDS)
* Open-source Flutter & TensorFlow community

```

---

Would you like me to also create a **minimal version** (short and clean) or do you prefer keeping this **detailed structured one**?
```
