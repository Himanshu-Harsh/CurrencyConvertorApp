import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Button,
  Text,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Platform, // Keep Platform if needed for styling/layout differences
  ScrollView, // Use ScrollView for better layout on smaller screens
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Import the picker

// --- Constants ---
// Using Frankfurter API - free, no API key needed for basic use
const API_URL_CURRENCIES = 'https://api.frankfurter.app/currencies';
const API_URL_LATEST = 'https://api.frankfurter.app/latest';

// --- Component ---
export default function CurrencyConverterScreen() {
  // --- State Variables ---
  const [amount, setAmount] = useState<string>('');
  const [sourceCurrency, setSourceCurrency] = useState<string>('USD');
  const [targetCurrency, setTargetCurrency] = useState<string>('EUR');
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [rates, setRates] = useState<Record<string, number> | null>(null); // Store rates relative to a base (EUR by default from API)
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Effects ---
  // Fetch available currencies and initial rates on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null); // Reset error on new fetch
      try {
        // Fetch available currencies
        const currencyResponse = await fetch(API_URL_CURRENCIES);
        if (!currencyResponse.ok) {
          throw new Error(`HTTP error! status: ${currencyResponse.status}`);
        }
        const currencyData: Record<string, string> = await currencyResponse.json();
        const currencyList = Object.keys(currencyData).sort(); // Get keys (codes) and sort them
        setAvailableCurrencies(currencyList);

        // Set default currencies if they exist in the fetched list
        if (!currencyList.includes(sourceCurrency)) {
            setSourceCurrency(currencyList.length > 0 ? currencyList[0] : ''); // Fallback
        }
        if (!currencyList.includes(targetCurrency)) {
            setTargetCurrency(currencyList.length > 1 ? currencyList[1] : (currencyList.length > 0 ? currencyList[0] : '')); // Fallback
        }

        // Fetch latest rates (base is EUR by default, which is fine)
        const ratesResponse = await fetch(API_URL_LATEST);
        if (!ratesResponse.ok) {
          throw new Error(`HTTP error! status: ${ratesResponse.status}`);
        }
        const ratesData = await ratesResponse.json();
        // Add the base currency (EUR) to the rates object for easier calculations
        setRates({ ...ratesData.rates, [ratesData.base]: 1 });

      } catch (fetchError: any) {
        console.error("Fetch error:", fetchError);
        setError(`Failed to fetch data: ${fetchError.message}. Please check your connection and try again.`);
        setRates(null); // Ensure rates are null on error
        setAvailableCurrencies([]); // Clear currencies on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  // --- Handlers ---
  const handleAmountChange = (text: string) => {
    // Allow only numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(text)) {
      setAmount(text);
      setConvertedAmount(null); // Reset result when amount changes
    }
  };

  const handleConvert = () => {
    Keyboard.dismiss(); // Hide keyboard on conversion
    setError(null); // Clear previous errors
    setConvertedAmount(null); // Reset result

    const numericAmount = parseFloat(amount);

    // Input Validation
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!rates) {
      setError('Exchange rates not available. Please try again later.');
      return;
    }
    if (!sourceCurrency || !targetCurrency) {
        setError('Please select source and target currencies.');
        return;
    }
     if (!rates[sourceCurrency] || !rates[targetCurrency]) {
        setError('Selected currency rate not available. Please try again or select different currencies.');
        console.warn("Missing rate for:", !rates[sourceCurrency] ? sourceCurrency : targetCurrency, "Rates object:", rates);
        return;
    }

    // Conversion Logic
    // Rates are relative to the base currency (EUR from Frankfurter default)
    // Formula: amount * (targetRate / sourceRate)
    // Or: (amount / sourceRate) * targetRate  (to convert amount to base first, then to target)
    try {
        const amountInBase = numericAmount / rates[sourceCurrency];
        const result = amountInBase * rates[targetCurrency];
        setConvertedAmount(result);
    } catch (calculationError) {
        console.error("Calculation error:", calculationError);
        setError("An error occurred during calculation.");
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading currencies...</Text>
      </View>
    );
  }

  // Use TouchableWithoutFeedback to dismiss keyboard when tapping outside inputs
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Currency Converter</Text>

        {/* Amount Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount:</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="Enter amount"
            keyboardType="numeric" // Use numeric keyboard
            placeholderTextColor="#999"
          />
        </View>

        {/* Source Currency Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>From:</Text>
          <View style={styles.pickerWrapper}>
             <Picker
                selectedValue={sourceCurrency}
                style={styles.picker}
                onValueChange={(itemValue) => {
                    setSourceCurrency(itemValue);
                    setConvertedAmount(null); // Reset result on currency change
                }}
                enabled={availableCurrencies.length > 0} // Disable if no currencies loaded
             >
                {availableCurrencies.map((currency) => (
                    <Picker.Item key={currency} label={currency} value={currency} />
                ))}
             </Picker>
          </View>
        </View>

        {/* Target Currency Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>To:</Text>
           <View style={styles.pickerWrapper}>
             <Picker
                selectedValue={targetCurrency}
                style={styles.picker}
                onValueChange={(itemValue) => {
                    setTargetCurrency(itemValue);
                    setConvertedAmount(null); // Reset result on currency change
                }}
                enabled={availableCurrencies.length > 0} // Disable if no currencies loaded
             >
                {availableCurrencies.map((currency) => (
                    <Picker.Item key={currency} label={currency} value={currency} />
                ))}
             </Picker>
           </View>
        </View>

        {/* Convert Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Convert"
            onPress={handleConvert}
            disabled={!amount || isLoading || !rates || availableCurrencies.length === 0} // Disable if no amount, loading, no rates, or no currencies
            color="#007AFF" // iOS blue
          />
        </View>

        {/* Error Display */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Result Display */}
        {convertedAmount !== null && !error && (
          <Text style={styles.resultText}>
            {amount} {sourceCurrency} = {convertedAmount.toFixed(2)} {targetCurrency}
          </Text>
        )}

      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5', // Light background for loading/error states
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  container: {
    flexGrow: 1, // Allows ScrollView to work correctly
    padding: 20,
    backgroundColor: '#f8f9fa', // A slightly off-white background
    alignItems: 'stretch', // Default, ensures children stretch horizontally
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff', // White background for input
  },
  // Wrapper needed for Android picker styling consistency
  pickerWrapper: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff', // White background for picker
    overflow: 'hidden', // Ensures border radius is applied
  },
  picker: {
     height: 50,
     width: '100%',
     // Note: Direct styling of Picker itself is limited, especially on iOS.
     // The wrapper helps.
     // On iOS, the picker item text color might inherit, on Android it might be dark by default.
     color: '#000', // Explicitly set text color if needed
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
     // Specific styling for Button component is limited, use TouchableOpacity for more control
     borderRadius: 8, // This might not apply directly to the native Button element
     overflow: 'hidden', // Helps contain button style if possible
  },
  errorText: {
    color: 'red',
    marginTop: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  resultText: {
    marginTop: 25,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: '#28a745', // Green color for success/result
  },
});
