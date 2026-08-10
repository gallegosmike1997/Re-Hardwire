import os
import streamlit as st


def load_system_prompt_master(path: str) -> str:
    if not os.path.exists(path):
        st.error(f"CRITICAL ERROR: '{path}' not found. Please create it.")
        st.stop()
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def build_profile_context(profile: dict) -> str:
    if not profile:
        return ""
    has_any = any(profile.get(k) for k in ["name", "feelings", "thoughts", "goals", "hobbies"])
    if not has_any:
        return ""
    return (
        f"\n\nUSER PROFILE CONTEXT:\n"
        f"- Name/Alias: {profile.get('name', 'User')}\n"
        f"- Current Feelings: {', '.join(profile.get('feelings', []))}\n"
        f"- Current Thought Patterns: {', '.join(profile.get('thoughts', []))}\n"
        f"- Current Goals: {profile.get('goals', 'None specified')}\n"
        f"- Hobbies & Interests: {', '.join(profile.get('hobbies', []))}\n"
        "INSTRUCTION: Tailor your therapeutic responses, framing, and metaphors to align with this background context when relevant."
    )


def build_location_instruction(detected_state: str, loc_permission: bool) -> str:
    if detected_state != "CRISIS":
        return ""
    if loc_permission:
        return (
            "\n\nLOCATION PERMISSIONS STATUS: [ENABLED]. "
            "CRITICAL RESOURCE INSTRUCTION: Provide specific, localized emergency services, crisis intervention centers, "
            "and mental health clinics in the user's regional area alongside national hotlines (e.g., 988 Suicide & Crisis Lifeline)."
        )
    return (
        "\n\nLOCATION PERMISSIONS STATUS: [DISABLED]. "
        "CRITICAL RESOURCE INSTRUCTION: Provide standard national hotlines (e.g., 988 Suicide & Crisis Lifeline, "
        "Crisis Text Line by texting HOME to 741741) and inform the user that they can enable Location Access "
        "in the Sidebar to receive localized crisis resource lookup."
    )


def build_state_injection(detected_state: str, location_instruction: str) -> str:
    return (
        f"\n\nCURRENT MODULE MODE: The user has been routed to the [{detected_state}] module. "
        "CRITICAL INSTRUCTION: If you provide any physical instructions (e.g., breathing exercises, "
        "grounding techniques, posture adjustments, or somatic movements), you MUST include a visual "
        "aid. Do this by embedding a Markdown image link precisely where the instruction occurs, using "
        "this format: ![Alt text](https://image.pollinations.ai/prompt/detailed-description-of-action?width=700&height=400&nologo=true) "
        "Ensure the description in the URL is hyphen-separated and accurately depicts the physical action."
        f"{location_instruction}"
    )


def build_system_prompt(base_prompt: str, profile: dict, detected_state: str, loc_permission: bool) -> str:
    profile_context = build_profile_context(profile)
    location_instruction = build_location_instruction(detected_state, loc_permission)
    state_injection = build_state_injection(detected_state, location_instruction)
    return base_prompt + profile_context + state_injection
