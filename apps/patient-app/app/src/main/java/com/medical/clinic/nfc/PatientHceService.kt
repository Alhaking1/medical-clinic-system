package com.medical.clinic.nfc

import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import android.util.Log

/**
 * Host Card Emulation (HCE) Service
 * Allows the patient's phone to act as an NFC smart ticket.
 * Broadcasts the booking code / appointment identifier to the staff reader upon contact.
 * Works 100% OFFLINE without any internet connection on the patient device.
 */
class PatientHceService : HostApduService() {

    companion object {
        private const val TAG = "PatientHceService"

        // APDU command for SELECT AID: 00 A4 04 00 [Lc] [AID]
        private val SELECT_APDU_HEADER = byteArrayOf(
            0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte()
        )

        // AID: F0010203040506
        private val AID_BYTES = byteArrayOf(
            0xF0.toByte(), 0x01.toByte(), 0x02.toByte(), 0x03.toByte(), 0x04.toByte(), 0x05.toByte(), 0x06.toByte()
        )

        private val SW_SUCCESS = byteArrayOf(0x90.toByte(), 0x00.toByte())
        private val SW_ERROR = byteArrayOf(0x6F.toByte(), 0x00.toByte())

        @Volatile
        var currentPayload: String? = null
    }

    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
        if (commandApdu == null) return SW_ERROR

        if (isSelectAidCommand(commandApdu)) {
            val payload = currentPayload ?: "TABEEBAK_APPT:NONE"
            val payloadBytes = payload.toByteArray(Charsets.UTF_8)
            Log.d(TAG, "NFC APDU received! Sending offline payload: $payload")
            return payloadBytes + SW_SUCCESS
        }

        return SW_SUCCESS
    }

    override fun onDeactivated(reason: Int) {
        Log.d(TAG, "NFC Deactivated: reason=$reason")
    }

    private fun isSelectAidCommand(apdu: ByteArray): Boolean {
        if (apdu.size < 5) return false
        for (i in SELECT_APDU_HEADER.indices) {
            if (apdu[i] != SELECT_APDU_HEADER[i]) return false
        }
        val lc = apdu[4].toInt() and 0xFF
        if (apdu.size < 5 + lc) return false
        if (lc != AID_BYTES.size) return false
        for (i in AID_BYTES.indices) {
            if (apdu[5 + i] != AID_BYTES[i]) return false
        }
        return true
    }
}
