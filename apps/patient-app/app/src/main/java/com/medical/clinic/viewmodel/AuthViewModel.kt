package com.medical.clinic.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.medical.clinic.data.models.User
import com.medical.clinic.data.api.RecoveryStatusResponse
import com.medical.clinic.data.api.RecoveryRequestResponse
import com.medical.clinic.data.api.CheckAccountResponse
import com.medical.clinic.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()

    private val _passwordState = MutableStateFlow<PasswordState>(PasswordState.Idle)
    val passwordState: StateFlow<PasswordState> = _passwordState.asStateFlow()
    private val _recoveryState = MutableStateFlow<RecoveryState>(RecoveryState.Idle)
    val recoveryState: StateFlow<RecoveryState> = _recoveryState.asStateFlow()
    private val _recoveryStatusState = MutableStateFlow<RecoveryStatusState>(RecoveryStatusState.Idle)
    val recoveryStatusState: StateFlow<RecoveryStatusState> = _recoveryStatusState.asStateFlow()
    private val _resetPasswordState = MutableStateFlow<ResetPasswordState>(ResetPasswordState.Idle)
    val resetPasswordState: StateFlow<ResetPasswordState> = _resetPasswordState.asStateFlow()
    private val _checkAccountState = MutableStateFlow<CheckAccountState>(CheckAccountState.Idle)
    val checkAccountState: StateFlow<CheckAccountState> = _checkAccountState.asStateFlow()
    fun login(email: String, password: String, role: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            authRepository.login(email, password, role)
                .onSuccess { user -> _loginState.value = LoginState.Success(user) }
                .onFailure { e -> _loginState.value = LoginState.Error(e.message ?: "خطأ غير معروف") }
        }
    }

    fun loginWithGoogle(idToken: String, role: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            authRepository.loginWithGoogle(idToken, role)
                .onSuccess { user -> _loginState.value = LoginState.Success(user) }
                .onFailure { e -> _loginState.value = LoginState.Error(e.message ?: "خطأ غير معروف") }
        }
    }

    fun setPassword(newPassword: String, currentPassword: String? = null) {
        viewModelScope.launch {
            _passwordState.value = PasswordState.Loading
            authRepository.setPassword(newPassword, currentPassword)
                .onSuccess { _passwordState.value = PasswordState.Success }
                .onFailure { e -> _passwordState.value = PasswordState.Error(e.message ?: "خطأ غير معروف") }
        }
    }

    fun requestAccountRecovery(fullName: String, phone: String) {
        viewModelScope.launch {
            _recoveryState.value = RecoveryState.Loading
            authRepository.requestAccountRecovery(fullName, phone)
                .onSuccess { msg ->
                    _recoveryState.value = RecoveryState.Success(RecoveryRequestResponse(success = true, message = msg))
                }
                .onFailure { e ->
                    _recoveryState.value = RecoveryState.Error(e.message ?: "خطأ غير معروف")
                }
        }
    }
    fun requestRecoveryWithPassword(login: String, oldPassword: String?, fullName: String?) {
        viewModelScope.launch {
            _recoveryState.value = RecoveryState.Loading
            authRepository.requestRecoveryWithPassword(login, oldPassword, fullName)
                .onSuccess { response ->
                    _recoveryState.value = RecoveryState.Success(response)
                }
                .onFailure { e ->
                    _recoveryState.value = RecoveryState.Error(e.message ?: "خطأ غير معروف")
                }
        }
    }
    fun checkRecoveryStatus(phone: String) {
        viewModelScope.launch {
            _recoveryStatusState.value = RecoveryStatusState.Loading
            authRepository.checkRecoveryStatus(phone)
                .onSuccess { response ->
                    _recoveryStatusState.value = RecoveryStatusState.Success(response)
                }
                .onFailure { e ->
                    _recoveryStatusState.value = RecoveryStatusState.Error(
                        e.message ?: "خطأ غير معروف"
                    )
                }
        }
    }

    fun resetPasswordWithRecovery(phone: String, newPassword: String) {
        viewModelScope.launch {
            _resetPasswordState.value = ResetPasswordState.Loading
            authRepository.resetPasswordWithRecovery(phone, newPassword)
                .onSuccess { message ->
                    _resetPasswordState.value = ResetPasswordState.Success(message)
                }
                .onFailure { e ->
                    _resetPasswordState.value = ResetPasswordState.Error(
                        e.message ?: "خطأ غير معروف"
                    )
                }
        }
    }

    fun autoLoginAfterReset(phone: String, password: String, role: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            authRepository.login(phone, password, role)
                .onSuccess { user ->
                    _loginState.value = LoginState.Success(user)
                }
                .onFailure { e ->
                    _loginState.value = LoginState.Error(e.message ?: "خطأ غير معروف")
                }
        }
    }
    fun checkAccountExists(login: String) {
        viewModelScope.launch {
            _checkAccountState.value = CheckAccountState.Loading
            authRepository.checkAccountExists(login)
                .onSuccess { response ->
                    _checkAccountState.value = CheckAccountState.Success(response)
                }
                .onFailure { e ->
                    _checkAccountState.value = CheckAccountState.Error(
                        e.message ?: "خطأ غير معروف"
                    )
                }
        }
    }

    fun resetCheckAccountState() {
        _checkAccountState.value = CheckAccountState.Idle
    }
    fun resetResetPasswordState() {
        _resetPasswordState.value = ResetPasswordState.Idle
    }
    fun resetRecoveryStatusState() {
        _recoveryStatusState.value = RecoveryStatusState.Idle
    }
    fun resetLoginState() { _loginState.value = LoginState.Idle }
    fun resetPasswordState() { _passwordState.value = PasswordState.Idle }
    fun resetRecoveryState() { _recoveryState.value = RecoveryState.Idle }

    fun logout() {
        viewModelScope.launch { authRepository.logout() }
    }

    sealed class LoginState {
        object Idle : LoginState()
        object Loading : LoginState()
        data class Success(val user: User) : LoginState()
        data class Error(val message: String) : LoginState()
    }

    sealed class PasswordState {
        object Idle : PasswordState()
        object Loading : PasswordState()
        object Success : PasswordState()
        data class Error(val message: String) : PasswordState()
    }
    sealed class RecoveryState {
        object Idle : RecoveryState()
        object Loading : RecoveryState()
        data class Success(val response: RecoveryRequestResponse) : RecoveryState()
        data class Error(val message: String) : RecoveryState()
    }
    sealed class RecoveryStatusState {
        object Idle : RecoveryStatusState()
        object Loading : RecoveryStatusState()
        data class Success(val data: RecoveryStatusResponse) : RecoveryStatusState()
        data class Error(val message: String) : RecoveryStatusState()
    }
    sealed class ResetPasswordState {
        object Idle : ResetPasswordState()
        object Loading : ResetPasswordState()
        data class Success(val message: String) : ResetPasswordState()
        data class Error(val message: String) : ResetPasswordState()
    }
    sealed class CheckAccountState {
        object Idle : CheckAccountState()
        object Loading : CheckAccountState()
        data class Success(val response: CheckAccountResponse) : CheckAccountState()
        data class Error(val message: String) : CheckAccountState()
    }

}