<div class="form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'id'=>'user-lesson-form',
	'enableAjaxValidation'=>false,
)); ?>

	<p class="note">Fields with <span class="required">*</span> are required.</p>

	<?php echo $form->errorSummary($model); ?>

	<div class="row">
		<?php echo $form->labelEx($model,'lesson_id'); ?>
		<?php echo $form->textField($model,'lesson_id'); ?>
		<?php echo $form->error($model,'lesson_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'user_id'); ?>
		<?php echo $form->textField($model,'user_id'); ?>
		<?php echo $form->error($model,'user_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'pending'); ?>
		<?php echo $form->textField($model,'pending',array('size'=>45,'maxlength'=>45)); ?>
		<?php echo $form->error($model,'pending'); ?>
	</div>

	<div class="row buttons">
		<?php echo CHtml::submitButton($model->isNewRecord ? 'Create' : 'Save'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- form -->