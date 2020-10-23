<div class="form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'id'=>'change-form',
	'enableAjaxValidation'=>false,
)); ?>

	<p class="note">Fields with <span class="required">*</span> are required.</p>

	<?php echo $form->errorSummary($model); ?>

<?php
	$static = array(
    	'Evolution'     => Yii::t('fim','Evolution'), 
	    'Modification' => Yii::t('fim','Modification'), 
	    'Correction'   => Yii::t('fim','Correction')	);
?>
	<div class="row">
		<?php echo $form->labelEx($model,'Type'); ?>
		<?php echo $form->dropDownList($model,'Type', $static); ?>
		<?php echo $form->error($model,'Type'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'Texte'); ?>
		<?php echo $form->textArea($model,'Texte',array('rows'=>6, 'cols'=>50)); ?>
		<?php echo $form->error($model,'Texte'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'Date'); ?>
		<?php	$this->widget('zii.widgets.jui.CJuiDatePicker', array(
					'model' => $model,
					'attribute' => 'Date',
					'language' => 'fr',
					'options' => array(
						'showAnim' => 'fold',
						'dateFormat' => 'yy-mm-dd', 
						'defaultDate' => $model->Date,
						'changeYear' => true,
						'changeMonth' => true,
						'yearRange' => '1900',
					),
					'htmlOptions'=>array(
  						'value'=>CTimestamp::formatDate('Y-m-d'),
					)
				)); ?>

		<?php echo $form->error($model,'Date'); ?>
	</div>

	<div class="row buttons">
		<?php echo CHtml::submitButton($model->isNewRecord ? 'Create' : 'Save'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- form -->