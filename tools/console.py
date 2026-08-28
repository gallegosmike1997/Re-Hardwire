import streamlit as st
import traceback


def launch_console():
    st.header("Developer Console")
    st.caption("Execute Python snippets inside the Re‑Hardwire sandbox environment.")

    # ---------------------------------------------------------
    # CODE INPUT
    # ---------------------------------------------------------
    st.markdown("### Code Input")

    code = st.text_area(
        "Enter Python code",
        height=200,
        placeholder="print('Hello from Re‑Hardwire Console')"
    )

    # ---------------------------------------------------------
    # EXECUTION
    # ---------------------------------------------------------
    if st.button("Run Code"):
        if not code.strip():
            st.warning("Please enter Python code before executing.")
            return

        try:
            local_env = {}
            exec(code, {}, local_env)

            st.success("Execution complete.")

            # ---------------------------------------------------------
            # OUTPUT VARIABLES
            # ---------------------------------------------------------
            st.markdown("### Output Variables")

            if local_env:
                st.json(local_env)
            else:
                st.info("No variables returned.")

        except Exception:
            st.error("Execution failed.")
            st.code(traceback.format_exc())

    # ---------------------------------------------------------
    # FOOTER
    # ---------------------------------------------------------
    st.markdown("---")
    st.caption("The Developer Console runs Python in a safe, isolated environment.")
