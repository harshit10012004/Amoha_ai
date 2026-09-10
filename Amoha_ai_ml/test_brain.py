from brain import analyze_care_log

def test_brain():
    result1 = analyze_care_log("Grandma is very angry and restless today", 0.5)
    print("Test 1:", result1)

    result2 = analyze_care_log("Patient refused dinner and is thirsty", 0.95)
    print("Test 2:", result2)

    result3 = analyze_care_log("All good today", 0.75)
    print("Test 3:", result3)

if __name__ == "__main__":
    test_brain()
