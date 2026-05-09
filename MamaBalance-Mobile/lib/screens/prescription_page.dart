import 'package:flutter/material.dart';

class PrescriptionPage extends StatefulWidget {
  const PrescriptionPage({super.key, this.showBackButton = false});

  final bool showBackButton;

  @override
  State<PrescriptionPage> createState() => _PrescriptionPageState();
}

class _PrescriptionPageState extends State<PrescriptionPage> {
  int currentPage = 0;

  final List<Map<String, dynamic>> prescriptions = [
    {
      'dateIssued': '15 June 2025',
      'prescribedBy': 'Dr. Smith',
      'status': 'Active',
      'medicines': [
        {
          'name': 'Fluoxetine 10mg',
          'timing': 'Morning',
          'instructions': [
            'Take 1 tablet daily in the morning after food.',
            'Do not miss doses.',
            'Continue for 4 weeks; review at next appointment.',
          ],
        },
        {
          'name': 'Sertraline 25mg',
          'timing': 'Night',
          'instructions': [
            'Take 1 tablet daily at night.',
            'Start with a low dose for 7 days, then increase to 50mg if no side effects.',
            'Do not stop suddenly.',
          ],
        },
      ],
      'notes': [
        'Mild side effects like nausea may occur for the first few days.',
        'Avoid alcohol during medication.',
      ],
    },
    {
      'dateIssued': '10 July 2025',
      'prescribedBy': 'Dr. Brown',
      'status': 'Follow-up',
      'medicines': [
        {
          'name': 'Amoxicillin 500mg',
          'timing': 'Every 8 hours',
          'instructions': [
            'Take 1 capsule every 8 hours.',
            'Complete the full course even if you feel better.',
          ],
        },
      ],
      'notes': [
        'Take with food to reduce stomach upset.',
        'Report any allergic reactions immediately.',
      ],
    },
  ];

  static const Color _accent = Color(0xFF4A90C2);
  static const Color _background = Color(0xFFF3FAFD);
  static const Color _surface = Color(0xFFEAF6FC);
  static const Color _text = Color(0xFF1F3A5F);
  static const Color _muted = Color(0xFF5F7285);

  @override
  Widget build(BuildContext context) {
    final item = prescriptions[currentPage];
    final medicines = (item['medicines'] as List).cast<Map<String, dynamic>>();

    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (widget.showBackButton) ...[
                          IconButton(
                            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _text),
                            onPressed: () => Navigator.pop(context),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                          ),
                          const SizedBox(width: 16),
                        ],
                        const Expanded(
                          child: Text(
                            'Prescriptions',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: _text,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Padding(
                      padding: EdgeInsets.only(left: widget.showBackButton ? 52 : 0),
                      child: const Text(
                        'Review the medicines, timing, and important care notes shared by your doctor.',
                        style: TextStyle(fontSize: 14, color: _muted, height: 1.45),
                      ),
                    ),
                    const SizedBox(height: 18),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF7EC8E3), Color(0xFF4A90C2)],
                      ),
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [BoxShadow(color: _accent.withOpacity(0.18), blurRadius: 20, offset: const Offset(0, 10))],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Current prescription overview', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(child: _heroChip('Issued', item['dateIssued'] as String)),
                            const SizedBox(width: 10),
                            Expanded(child: _heroChip('Doctor', item['prescribedBy'] as String)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(child: _heroChip('Status', item['status'] as String)),
                            const SizedBox(width: 10),
                            Expanded(child: _heroChip('Medicines', '${medicines.length} items')),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text('Medicines', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: _text)),
                  const SizedBox(height: 10),
                  ...medicines.map((medicine) {
                    final instructions = (medicine['instructions'] as List).cast<String>();
                    return Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFD6EAF5)),
                        boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 12, offset: Offset(0, 5))],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 46,
                                height: 46,
                                decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(14)),
                                child: const Icon(Icons.medication_rounded, color: _accent),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(medicine['name'] as String, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: _text)),
                                    const SizedBox(height: 4),
                                    Text(medicine['timing'] as String, style: const TextStyle(fontSize: 13, color: _muted, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          ...instructions.map((instruction) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Padding(
                                      padding: EdgeInsets.only(top: 6),
                                      child: Icon(Icons.circle, size: 8, color: _accent),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(child: Text(instruction, style: const TextStyle(color: _muted, height: 1.45))),
                                  ],
                                ),
                              )),
                        ],
                      ),
                    );
                  }),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFD6EAF5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Care notes', style: TextStyle(fontWeight: FontWeight.w700, color: _text, fontSize: 16)),
                        const SizedBox(height: 12),
                        ...((item['notes'] as List).cast<String>().map((note) => Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(18)),
                              child: Text(note, style: const TextStyle(color: _muted, height: 1.45)),
                            ))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
              child: Row(
                children: [
                  Expanded(child: _pagerButton('Previous', currentPage > 0, () => setState(() => currentPage--))),
                  const SizedBox(width: 10),
                  ...List.generate(prescriptions.length, (index) {
                    final isSelected = index == currentPage;
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: InkWell(
                        onTap: () => setState(() => currentPage = index),
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: isSelected ? _accent : Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFD6EAF5)),
                          ),
                          alignment: Alignment.center,
                          child: Text('${index + 1}', style: TextStyle(color: isSelected ? Colors.white : _text, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    );
                  }),
                  const SizedBox(width: 10),
                  Expanded(child: _pagerButton('Next', currentPage < prescriptions.length - 1, () => setState(() => currentPage++))),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

  Widget _heroChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.16),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 14, color: Colors.white, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _pagerButton(String label, bool enabled, VoidCallback onTap) {
    return SizedBox(
      height: 44,
      child: ElevatedButton(
        onPressed: enabled ? onTap : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: enabled ? _accent : const Color(0xFFEAF6FC),
          foregroundColor: enabled ? Colors.white : const Color(0xFF5F7285),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: Text(label),
      ),
    );
  }
}
