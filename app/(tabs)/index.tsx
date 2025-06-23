import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

interface InvestmentData {
  currentAge: string;
  retirementAge: string;
  currentInvestment: string;
  yearlyInvestment: string;
  expectedReturn: string;
  withdrawalRate: string;
  withdrawalAmount: string;
  withdrawalType: "percentage" | "amount";
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export default function HomeScreen() {
  const [formData, setFormData] = useState<InvestmentData>({
    currentAge: "",
    retirementAge: "",
    currentInvestment: "",
    yearlyInvestment: "",
    expectedReturn: "7", // Default 7% return
    withdrawalRate: "4", // Default 4% withdrawal rate
    withdrawalAmount: "", // Fixed withdrawal amount
    withdrawalType: "percentage", // Default to percentage-based withdrawal
  });

  const calculateInvestmentGrowth = useMemo(() => {
    const currentAge = parseFloat(formData.currentAge);
    const retirementAge = parseFloat(formData.retirementAge);
    const currentInvestment = parseFloat(formData.currentInvestment);
    const yearlyInvestment = parseFloat(formData.yearlyInvestment);
    const expectedReturn = parseFloat(formData.expectedReturn) / 100;

    // Validate inputs
    if (
      isNaN(currentAge) ||
      isNaN(retirementAge) ||
      isNaN(currentInvestment) ||
      isNaN(yearlyInvestment) ||
      isNaN(expectedReturn)
    ) {
      return null;
    }

    if (retirementAge <= currentAge) {
      return null;
    }

    const years = retirementAge - currentAge;
    const growthData: number[] = [];
    const labels: string[] = [];

    let totalInvestment = currentInvestment;

    for (let year = 0; year <= years; year++) {
      const currentAgeAtYear = currentAge + year;
      labels.push(currentAgeAtYear.toString());

      if (year === 0) {
        growthData.push(totalInvestment);
      } else {
        // Apply annual return to previous total, then add yearly investment
        totalInvestment =
          totalInvestment * (1 + expectedReturn) + yearlyInvestment;
        growthData.push(totalInvestment);
      }
    }

    return {
      labels:
        labels.length > 10
          ? labels.filter(
              (_, index) => index % Math.ceil(labels.length / 10) === 0
            )
          : labels,
      datasets: [
        {
          data:
            growthData.length > 10
              ? growthData.filter(
                  (_, index) => index % Math.ceil(growthData.length / 10) === 0
                )
              : growthData,
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 3,
        },
      ],
      finalAmount: totalInvestment,
      totalContributions: currentInvestment + yearlyInvestment * years,
      totalGrowth:
        totalInvestment - (currentInvestment + yearlyInvestment * years),
    };
  }, [formData]);

  const calculateEarlyRetirementProjection = useMemo(() => {
    const currentAge = parseFloat(formData.currentAge);
    const retirementAge = parseFloat(formData.retirementAge);
    const currentInvestment = parseFloat(formData.currentInvestment);
    const yearlyInvestment = parseFloat(formData.yearlyInvestment);
    const expectedReturn = parseFloat(formData.expectedReturn) / 100;
    const withdrawalRate = parseFloat(formData.withdrawalRate) / 100;
    const withdrawalAmount = parseFloat(formData.withdrawalAmount);

    // Validate basic inputs
    if (
      isNaN(currentAge) ||
      isNaN(retirementAge) ||
      isNaN(currentInvestment) ||
      isNaN(yearlyInvestment) ||
      isNaN(expectedReturn) ||
      currentAge >= retirementAge ||
      retirementAge >= 55 // Only show for early retirement (before pension access)
    ) {
      return null;
    }

    // Validate withdrawal method specific inputs
    if (formData.withdrawalType === "percentage" && isNaN(withdrawalRate)) {
      return null;
    }
    if (formData.withdrawalType === "amount" && isNaN(withdrawalAmount)) {
      return null;
    }

    // Calculate balance at retirement age
    const yearsToRetirement = retirementAge - currentAge;
    let balanceAtRetirement = currentInvestment;

    for (let year = 1; year <= yearsToRetirement; year++) {
      balanceAtRetirement =
        balanceAtRetirement * (1 + expectedReturn) + yearlyInvestment;
    }

    // Calculate balance at 55 after withdrawals from retirement age to 55
    let balanceAtFiftyFive = balanceAtRetirement;
    const withdrawalYears = 55 - retirementAge; // From retirement age to 55
    let annualWithdrawal: number;

    if (formData.withdrawalType === "percentage") {
      annualWithdrawal = balanceAtRetirement * withdrawalRate;

      for (let year = 1; year <= withdrawalYears; year++) {
        // Apply growth first
        balanceAtFiftyFive = balanceAtFiftyFive * (1 + expectedReturn);
        // Then withdraw percentage of current balance
        const withdrawal = balanceAtFiftyFive * withdrawalRate;
        balanceAtFiftyFive = balanceAtFiftyFive - withdrawal;
      }
    } else {
      // Fixed amount withdrawal
      annualWithdrawal = withdrawalAmount;

      for (let year = 1; year <= withdrawalYears; year++) {
        // Apply growth first
        balanceAtFiftyFive = balanceAtFiftyFive * (1 + expectedReturn);
        // Then withdraw fixed amount
        balanceAtFiftyFive = balanceAtFiftyFive - withdrawalAmount;

        // If balance goes negative, break early
        if (balanceAtFiftyFive < 0) {
          balanceAtFiftyFive = 0;
          break;
        }
      }
    }

    return {
      balanceAtRetirement,
      balanceAtFiftyFive,
      annualWithdrawal,
      withdrawalType: formData.withdrawalType,
      totalWithdrawn: annualWithdrawal * withdrawalYears,
    };
  }, [formData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const updateFormData = (field: keyof InvestmentData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#8641f4",
    },
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Wealth Forecast 💰</ThemedText>
          <ThemedText style={styles.subtitle}>
            Plan your path to early retirement
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText type="subtitle">Your Information</ThemedText>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Current Age</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g., 25"
              value={formData.currentAge}
              onChangeText={(value) => updateFormData("currentAge", value)}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Desired Retirement Age</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g., 55"
              value={formData.retirementAge}
              onChangeText={(value) => updateFormData("retirementAge", value)}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Current Investment Amount ($)
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g., 50000"
              value={formData.currentInvestment}
              onChangeText={(value) =>
                updateFormData("currentInvestment", value)
              }
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Yearly Investment Amount ($)
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g., 20000"
              value={formData.yearlyInvestment}
              onChangeText={(value) =>
                updateFormData("yearlyInvestment", value)
              }
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Expected Annual Return (%)
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g., 7"
              value={formData.expectedReturn}
              onChangeText={(value) => updateFormData("expectedReturn", value)}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Withdrawal Method</ThemedText>
            <ThemedView style={styles.toggleContainer}>
              <ThemedView
                style={[
                  styles.toggleButton,
                  formData.withdrawalType === "percentage" &&
                    styles.toggleButtonActive,
                ]}
              >
                <ThemedText
                  style={[
                    styles.toggleText,
                    formData.withdrawalType === "percentage" &&
                      styles.toggleTextActive,
                  ]}
                  onPress={() => updateFormData("withdrawalType", "percentage")}
                >
                  Percentage
                </ThemedText>
              </ThemedView>
              <ThemedView
                style={[
                  styles.toggleButton,
                  formData.withdrawalType === "amount" &&
                    styles.toggleButtonActive,
                ]}
              >
                <ThemedText
                  style={[
                    styles.toggleText,
                    formData.withdrawalType === "amount" &&
                      styles.toggleTextActive,
                  ]}
                  onPress={() => updateFormData("withdrawalType", "amount")}
                >
                  Fixed Amount
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>

          {formData.withdrawalType === "percentage" ? (
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Annual Withdrawal Rate (%)
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="e.g., 4"
                value={formData.withdrawalRate}
                onChangeText={(value) =>
                  updateFormData("withdrawalRate", value)
                }
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </ThemedView>
          ) : (
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Annual Withdrawal Amount ($)
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="e.g., 80000"
                value={formData.withdrawalAmount}
                onChangeText={(value) =>
                  updateFormData("withdrawalAmount", value)
                }
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </ThemedView>
          )}
        </ThemedView>

        {calculateInvestmentGrowth && (
          <ThemedView style={styles.resultsContainer}>
            <ThemedText type="subtitle">Your Wealth Forecast</ThemedText>

            <ThemedView style={styles.summaryContainer}>
              <ThemedView style={styles.summaryItem}>
                <ThemedText style={styles.summaryLabel}>
                  Final Amount
                </ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {formatCurrency(calculateInvestmentGrowth.finalAmount)}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.summaryItem}>
                <ThemedText style={styles.summaryLabel}>
                  Total Contributions
                </ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {formatCurrency(calculateInvestmentGrowth.totalContributions)}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.summaryItem}>
                <ThemedText style={styles.summaryLabel}>
                  Investment Growth
                </ThemedText>
                <ThemedText style={[styles.summaryValue, styles.growthValue]}>
                  {formatCurrency(calculateInvestmentGrowth.totalGrowth)}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.chartContainer}>
              <LineChart
                data={calculateInvestmentGrowth as ChartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                formatYLabel={(value) => {
                  const num = parseFloat(value);
                  if (num >= 1000000) {
                    return `$${(num / 1000000).toFixed(1)}M`;
                  } else if (num >= 1000) {
                    return `$${(num / 1000).toFixed(0)}K`;
                  }
                  return `$${num.toFixed(0)}`;
                }}
              />
              <ThemedText style={styles.chartLabel}>
                Investment Growth Over Time (Age)
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        {calculateEarlyRetirementProjection &&
          parseFloat(formData.retirementAge) < 55 && (
            <ThemedView style={styles.earlyRetirementContainer}>
              <ThemedText type="subtitle">
                🎯 Early Retirement Scenario
              </ThemedText>
              <ThemedText style={styles.scenarioDescription}>
                If you retire at age {formData.retirementAge} and withdraw{" "}
                {calculateEarlyRetirementProjection.withdrawalType ===
                "percentage"
                  ? `${formData.withdrawalRate}% annually`
                  : `${formatCurrency(
                      parseFloat(formData.withdrawalAmount)
                    )} per year`}{" "}
                until you can access your pension at 55:
              </ThemedText>

              <ThemedView style={styles.projectionGrid}>
                <ThemedView style={styles.projectionItem}>
                  <ThemedText style={styles.projectionLabel}>
                    Balance at Age {formData.retirementAge}
                  </ThemedText>
                  <ThemedText style={styles.projectionValue}>
                    {formatCurrency(
                      calculateEarlyRetirementProjection.balanceAtRetirement
                    )}
                  </ThemedText>
                </ThemedView>

                <ThemedView style={styles.projectionItem}>
                  <ThemedText style={styles.projectionLabel}>
                    Annual Withdrawal
                  </ThemedText>
                  <ThemedText style={styles.projectionValue}>
                    {formatCurrency(
                      calculateEarlyRetirementProjection.annualWithdrawal
                    )}
                  </ThemedText>
                </ThemedView>

                <ThemedView style={styles.projectionItem}>
                  <ThemedText style={styles.projectionLabel}>
                    Balance at Age 55
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.projectionValue,
                      calculateEarlyRetirementProjection.balanceAtFiftyFive > 0
                        ? styles.positiveValue
                        : styles.negativeValue,
                    ]}
                  >
                    {formatCurrency(
                      calculateEarlyRetirementProjection.balanceAtFiftyFive
                    )}
                  </ThemedText>
                </ThemedView>
              </ThemedView>

              {calculateEarlyRetirementProjection.balanceAtFiftyFive <= 0 && (
                <ThemedView style={styles.warningContainer}>
                  <ThemedText style={styles.warningText}>
                    ⚠️ Warning: Your funds may be depleted before age 55.
                    Consider reducing your withdrawal rate or increasing your
                    retirement age.
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          )}

        {!calculateInvestmentGrowth && (
          <ThemedView style={styles.placeholderContainer}>
            <ThemedText style={styles.placeholderText}>
              📊 Fill in your information above to see your wealth forecast
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 30,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  resultsContainer: {
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#666",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  growthValue: {
    color: "#22c55e",
  },
  chartContainer: {
    alignItems: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  placeholderContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    marginTop: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  earlyRetirementContainer: {
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#e3f2fd",
  },
  scenarioDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 20,
  },
  projectionGrid: {
    gap: 12,
  },
  projectionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },
  projectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  projectionValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  positiveValue: {
    color: "#22c55e",
  },
  negativeValue: {
    color: "#ef4444",
  },
  warningContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fef3cd",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f6e05e",
  },
  warningText: {
    fontSize: 14,
    color: "#92400e",
    textAlign: "center",
    lineHeight: 18,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#8641f4",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  toggleTextActive: {
    color: "#fff",
  },
});
