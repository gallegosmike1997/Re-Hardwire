#!/usr/bin/env python3
"""
Test the enhanced routing system
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.routing.advanced_main import route_message
from app.core.routing.advanced_utils import list_protocols, get_protocol_info

def test_basic_routing():
    """Test basic routing functionality"""
    print("=" * 60)
    print("Testing Enhanced Routing System")
    print("=" * 60)
    
    # List available protocols
    print("\n📋 Available Protocols:")
    protocols = list_protocols()
    for protocol in protocols:
        print(f"  • {protocol['code']}: {protocol['name']} - {protocol['focus']}")
    
    # Test routing with different inputs
    test_cases = [
        ("I feel overwhelmed and anxious", "Anxiety/Somatic"),
        ("I'm having negative thoughts about the future", "CBT"),
        ("My emotions are too much to handle", "DBT"),
        ("I want to live according to my values", "ACT"),
        ("I need help with grounding techniques", "Somatic"),
        ("test", "General"),
    ]
    
    print("\n🧪 Test Routing Results:")
    for user_input, expected_type in test_cases:
        try:
            result = route_message(user_input)
            print(f"\n  Input: '{user_input}'")
            print(f"  → Protocol: {result.protocol} (confidence: {result.confidence:.2f})")
            print(f"  → Reason: {result.reason}")
            print(f"  → Detected State: {result.detected_state}")
            print(f"  → Next Action: {result.next_action}")
            print(f"  → Tags: {', '.join(result.tags)}")
        except Exception as e:
            print(f"\n  ❌ Error with input '{user_input}': {e}")
    
    # Test protocol information
    print("\n📚 Protocol Details:")
    for protocol_code in ["CRISIS", "CBT", "DBT", "ACT", "SOMATIC"]:
        info = get_protocol_info(protocol_code)
        print(f"\n  {protocol_code}:")
        print(f"    Name: {info['name']}")
        print(f"    Focus: {info['focus']}")
        print(f"    Keywords: {', '.join(info['keywords'][:5])}...")
        print(f"    Actions: {', '.join(info['recommended_actions'][:2])}...")
    
    print("\n" + "=" * 60)
    print("✅ Enhanced Routing Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_basic_routing()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)