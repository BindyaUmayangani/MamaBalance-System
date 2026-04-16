import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class EpdsTrendScreen extends StatelessWidget {
  const EpdsTrendScreen({super.key});

  static const Color _mint = Color(0xFF4FA38A);
  static const Color _mintSoft = Color(0xFFEAF7F2);
  static const Color _background = Color(0xFFF3FBF8);
  static const Color _text = Color(0xFF203C35);
  static const Color _muted = Color(0xFF60756D);

  final List<Map<String, dynamic>> epdsTrend = const [
    {"label": "Jul 1", "score": 11},
    {"label": "Jul 8", "score": 13},
    {"label": "Jul 15", "score": 9},
    {"label": "Jul 22", "score": 14},
    {"label": "Jul 29", "score": 12},
  ];

  Color _scoreColor(int score) {
    if (score <= 9) return const Color(0xFF4FA38A);
    if (score <= 12) return const Color(0xFFF0A45B);
    return const Color(0xFFE06B63);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      appBar: AppBar(
        backgroundColor: _background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _text),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Score History',
          style: TextStyle(
            color: _text,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your Emotional Health Trends',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: _text,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'This chart shows how your EPDS scores have changed over time so you can understand your wellbeing journey more clearly.',
              style: TextStyle(fontSize: 15, height: 1.5, color: _muted),
            ),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _mintSoft,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFD6ECE5)),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'How to read this chart',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: _text,
                    ),
                  ),
                  SizedBox(height: 10),
                  Text(
                    'Each point shows your score for that week. Lower scores can suggest a lighter emotional load, while higher scores can mean you may need extra care, rest, or support from your healthcare team.',
                    style: TextStyle(fontSize: 14, height: 1.5, color: _muted),
                  ),
                  SizedBox(height: 14),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _RangeChip(label: '0-9', color: Color(0xFF4FA38A)),
                      _RangeChip(label: '10-12', color: Color(0xFFF0A45B)),
                      _RangeChip(label: '13-30', color: Color(0xFFE06B63)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFDCEDE7)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'EPDS Score Chart',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: _text,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 220,
                    child: LineChart(
                      LineChartData(
                        minY: 0,
                        maxY: 30,
                        borderData: FlBorderData(show: false),
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          getDrawingHorizontalLine: (value) => const FlLine(
                            color: Color(0xFFE6F1ED),
                            strokeWidth: 1,
                          ),
                        ),
                        titlesData: FlTitlesData(
                          bottomTitles: AxisTitles(
                            axisNameWidget: const Padding(
                              padding: EdgeInsets.only(top: 12),
                              child: Text(
                                'Week',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                            axisNameSize: 28,
                            sideTitles: SideTitles(
                              showTitles: true,
                              interval: 1,
                              getTitlesWidget: (value, _) {
                                final index = value.toInt();
                                return Text(
                                  index >= 0 && index < epdsTrend.length
                                      ? epdsTrend[index]['label'] as String
                                      : '',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: _muted,
                                  ),
                                );
                              },
                            ),
                          ),
                          leftTitles: AxisTitles(
                            axisNameWidget: const RotatedBox(
                              quarterTurns: 3,
                              child: Text(
                                'Score',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                            axisNameSize: 28,
                            sideTitles: SideTitles(
                              showTitles: true,
                              interval: 5,
                              getTitlesWidget: (value, _) => Text(
                                value.toInt().toString(),
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: _muted,
                                ),
                              ),
                            ),
                          ),
                          topTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                          rightTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                        ),
                        lineBarsData: [
                          LineChartBarData(
                            spots: epdsTrend
                                .asMap()
                                .entries
                                .map(
                                  (entry) => FlSpot(
                                    entry.key.toDouble(),
                                    (entry.value['score'] as int).toDouble(),
                                  ),
                                )
                                .toList(),
                            isCurved: true,
                            color: _mint,
                            barWidth: 4,
                            belowBarData: BarAreaData(
                              show: true,
                              color: _mint.withOpacity(0.08),
                            ),
                            dotData: FlDotData(
                              show: true,
                              getDotPainter: (spot, percent, barData, index) {
                                final score = spot.y.toInt();
                                return FlDotCirclePainter(
                                  radius: 6,
                                  color: _scoreColor(score),
                                  strokeWidth: 2,
                                  strokeColor: Colors.white,
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _mint,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Text('Previous'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _mint,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Text('Next'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            const Text(
              'Keep checking in weekly to stay aware of how you feel. If your scores move upward or you feel concerned at any time, your care team can support you.',
              style: TextStyle(
                fontSize: 15,
                height: 1.5,
                fontStyle: FontStyle.italic,
                color: _muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RangeChip extends StatelessWidget {
  final String label;
  final Color color;

  const _RangeChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: EpdsTrendScreen._text,
            ),
          ),
        ],
      ),
    );
  }
}
